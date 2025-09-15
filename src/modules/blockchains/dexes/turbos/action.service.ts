import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams
} from "../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { computePercentage, computeRatio, computeRaw, Network, toUnit, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils"
import { ActionResponse } from "../../dexes"
import { FeeToService, PriceRatioService, TickMathService } from "../../utils"
import { BN } from "bn.js"
import Decimal from "decimal.js"
import { TurbosZapService } from "./zap.service"
import { InjectSuiClients, PythService, SuiSwapService } from "@modules/blockchains"
import { SuiCoinManagerService } from "../../utils"
import { TransactionObjectArgument } from "@mysten/sui/transactions"
import {
    CLOSE_POSITION_SLIPPAGE,
    OPEN_POSITION_SLIPPAGE,
    SWAP_OPEN_POSITION_SLIPPAGE
} from "../../swap"
import { SuiClient } from "@mysten/sui/dist/cjs/client"
import { GasSuiSwapUtilsService } from "../../swap"
import { clientIndex } from "./inner-constants"

@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
        private readonly tickManagerService: TickManagerService,
        private readonly feeToService: FeeToService,
        private readonly tickMathService: TickMathService,
        private readonly turbosZapService: TurbosZapService,
        private readonly pythService: PythService,
        private readonly suiSwapService: SuiSwapService,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
        private readonly priceRatioService: PriceRatioService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) { }

    // open position
    async openPosition({
        pool,
        network = Network.Mainnet,
        tokenAId,
        tokenBId,
        tokens,
        priorityAOverB,
        accountAddress,
        amount,
        slippage,
        swapSlippage
    }: OpenPositionParams): Promise<ActionResponse> {
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || SWAP_OPEN_POSITION_SLIPPAGE
        const suiClient = this.suiClients[network][clientIndex]
        const turbosSdk = this.turbosClmmSdks[network]
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const tokenIn = priorityAOverB ? tokenA : tokenB
        const tokenOut = priorityAOverB ? tokenB : tokenA
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId,
            tokenBId,
            chainId: tokenA.chainId,
            network,
        })
        const {
            txb: txAfterSwapGas,
            requireGasSwap,
            remainingAmount: remainingAmountAfterSwapGas
        } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            accountAddress,
            tokenInId: tokenIn.displayId,
            tokens,
            slippage,
            suiClient
        })
        if (requireGasSwap) {
            if (!remainingAmountAfterSwapGas) {
                throw new Error("Remaining amount after swap gas is missing")
            }
            amount = remainingAmountAfterSwapGas
        }
        const {
            txb: txbAfterAttachFee,
            remainingAmount,
            sourceCoin
        } = await this.feeToService.attachSuiFee({
            txb: txAfterSwapGas,
            tokenAddress: tokenIn.tokenAddress,
            accountAddress,
            network,
            amount,
            suiClient
        })
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const [
            amountA,
            amountB
        ] = turbosSdk.pool.estimateAmountsFromOneAmount({
            amount: quoteAmountA.toString(),
            isAmountA: true,
            sqrtPrice: pool.currentSqrtPrice.toString(),
            tickLower,
            tickUpper,
        })
        const ratio = computeRatio(
            new BN(amountB).mul(toUnit(tokenA.decimals)),
            new BN(amountA).mul(toUnit(tokenB.decimals))
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { swapAmount, routerId, quoteData, receiveAmount, remainAmount } =
            await this.turbosZapService.computeZapAmounts({
                amountIn: remainingAmount,
                ratio: new Decimal(ratio),
                spotPrice,
                priorityAOverB,
                tokenAId,
                tokenBId,
                tokens,
                oraclePrice,
                network,
                swapSlippage,
            })

        // 4. optional ratio check
        const zapAmountA = priorityAOverB 
            ? new BN(remainingAmount) : new BN(receiveAmount)
        const zapAmountB = priorityAOverB 
            ? new BN(receiveAmount) : new BN(remainingAmount)
        const isZapEligible = this.priceRatioService.isZapEligible({
            priorityAOverB,
            tokenA: {
                tokenDecimals: tokenA.decimals,
                amount: new BN(zapAmountA),
            },
            tokenB: {
                tokenDecimals: tokenB.decimals,
                amount: new BN(zapAmountB),
            },
        })
        if (!isZapEligible) throw new Error("Zap not eligible at this moment")

        const { spendCoin } = await this.suiCoinManagerService.splitCoin({
            txb: txbAfterAttachFee,
            sourceCoin,
            requiredAmount: swapAmount,
        })
        const { txb: txbAfterSwap, extraObj } = await this.suiSwapService.swap({
            txb: txbAfterAttachFee,
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            slippage: swapSlippage,
            inputCoinObj: spendCoin,
            transferCoinObjs: false
        })
        const coinOut = (extraObj as { coinOut: TransactionObjectArgument }).coinOut
        // we process add liquidity
        const providedAmountA = priorityAOverB ? remainAmount : receiveAmount
        const providedAmountB = priorityAOverB ? receiveAmount : remainAmount
        if (!coinOut) {
            throw new Error("Coin out or change coin is missing")
        }
        const providedCoinAmountA = priorityAOverB ? sourceCoin : coinOut
        const providedCoinAmountB = priorityAOverB ? coinOut : sourceCoin
        const txbAfterOpenPosition = await turbosSdk.pool.addLiquidityByAmountObject({
            pool: pool.poolAddress,
            address: accountAddress,
            amountA: providedAmountA.toString(),
            amountB: providedAmountB.toString(),
            tickLower,
            tickUpper,
            slippage: computePercentage(slippage),
            txb: txbAfterSwap,
            coinAObjectArguments: [providedCoinAmountA],
            coinBObjectArguments: [providedCoinAmountB],
        })
        return {
            txb: txbAfterOpenPosition
        }
    }

    // close postion
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
        tokenAId,
        tokenBId,
        tokens,
        slippage,
    }: ClosePositionParams): Promise<ActionResponse> {
        // maximum slippage to ensure the transaction is successful
        slippage = slippage || CLOSE_POSITION_SLIPPAGE
        const turbosSdk = this.turbosClmmSdks[network]
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        // txb
        const txbAfterRemoveLiquidity =
            await turbosSdk
                .pool
                .removeLiquidity({
                    txb,
                    nft: position.positionId,
                    pool: pool.poolAddress,
                    address: accountAddress,
                    amountA: ZERO_BN.toString(),
                    amountB: ZERO_BN.toString(),
                    slippage: computePercentage(slippage),
                    collectAmountA: ZERO_BN.toString(),
                    collectAmountB: ZERO_BN.toString(),
                    rewardAmounts: [],
                    decreaseLiquidity: position.liquidity
                })
        return {
            txb: txbAfterRemoveLiquidity,
        }
    }
}

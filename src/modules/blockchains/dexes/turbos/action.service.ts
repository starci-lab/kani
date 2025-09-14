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
import { FeeToService, TickMathService } from "../../utils"
import { BN } from "bn.js"
import Decimal from "decimal.js"
import { TurbosZapService } from "./zap.service"
import { PythService, SuiSwapService } from "@modules/blockchains"
import { SuiCoinManagerService } from "../../utils"
import { TransactionObjectArgument } from "@mysten/sui/transactions"
import { 
    CLOSE_POSITION_SLIPPAGE, 
    OPEN_POSITION_SLIPPAGE, 
    SWAP_CLOSE_POSITION_SLIPPAGE, 
    SWAP_OPEN_POSITION_SLIPPAGE
} from "../constants"
import { ModuleRef } from "@nestjs/core"

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
        private readonly moduleRef: ModuleRef,
    ) { }

    // open position
    async openPosition({
        pool,
        network = Network.Mainnet,
        txb,
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
            txb: txbAfterAttachFee,
            remainingAmount,
            sourceCoin
        } = await this.feeToService.attachSuiFee({
            txb,
            tokenAddress: tokenIn.tokenAddress,
            accountAddress,
            network,
            amount,
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
        priorityAOverB,
        tokenAId,
        tokenBId,
        tokens,
        slippage,
        swapSlippage,
    }: ClosePositionParams): Promise<ActionResponse> {
        const turbosSdk = this.turbosClmmSdks[network]
        // maximum slippage to ensure the transaction is successful
        slippage = slippage || CLOSE_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || SWAP_CLOSE_POSITION_SLIPPAGE

        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const tokenIn = priorityAOverB ? tokenA : tokenB
        const tokenOut = priorityAOverB ? tokenB : tokenA
        const [
            estimatedWithdrawAmountA,
            estimatedWithdrawAmountB
        ] = turbosSdk.pool.getTokenAmountsFromLiquidity({
            liquidity: new BN(position.liquidity),
            currentSqrtPrice: new BN(pool.currentSqrtPrice),
            lowerSqrtPrice: new BN(turbosSdk.math.tickIndexToSqrtPriceX64(position.tickLower)),
            upperSqrtPrice: new BN(turbosSdk.math.tickIndexToSqrtPriceX64(position.tickUpper)),
        })
        const estimatedNonPriorityWithdrawAmount = priorityAOverB ? estimatedWithdrawAmountB : estimatedWithdrawAmountA
        const { routerId, quoteData } = await this.suiSwapService.quote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: estimatedNonPriorityWithdrawAmount,
            tokens,
        })
        // txb
        const { txb: txbAfterRemoveLiquidity, coinA, coinB } =
            await this.turbosClmmSdks[network]
                .pool
                .removeLiquidityWithReturn({
                    txb,
                    nft: position.positionId,
                    pool: pool.poolAddress,
                    address: accountAddress,
                    amountA: ZERO_BN.toString(),
                    amountB: ZERO_BN.toString(),
                    slippage: slippage,
                    collectAmountA: ZERO_BN.toString(),
                    collectAmountB: ZERO_BN.toString(),
                    rewardAmounts: [],
                    decreaseLiquidity: position.liquidity
                })
        const { txb: txbAfterSwap } = await this.suiSwapService.swap({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            tokens,
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            slippage: swapSlippage,
            inputCoinObj: priorityAOverB ? coinA : coinB,
            transferCoinObjs: true,
            txb: txbAfterRemoveLiquidity,
        })
        return {
            txb: txbAfterSwap,
            extraObj: {
                coinA,
                coinB,
            }
        }
    }
}

import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { computePercentage, computeRatio, computeRaw, Network, toUnit, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils/tick-manager.service"
import { ActionResponse } from "../../dexes"
import { FeeToService, TickMathService } from "../../utils"
import { BN } from "bn.js"
import Decimal from "decimal.js"
import { TurbosZapService } from "./zap.service"
import { InjectSuiClients, PythService, SuiSwapService } from "@modules/blockchains"
import { SuiCoinManagerService } from "../../utils"
import { SuiClient } from "@mysten/sui/client"
import { TransactionObjectArgument } from "@mysten/sui/transactions"

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
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
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
    }: OpenPositionParams): Promise<ActionResponse> {
        const slippage = 0.001 // 0.1%
        const turbosSdk = this.turbosClmmSdks[network]
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const tokenIn = priorityAOverB ? tokenA : tokenB
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId,
            tokenBId,
            chainId: tokenA.chainId,
            network,
        })
        const { 
            txb: txbAfterAttachFee, 
            remainingAmount,
            changeCoin: feeChangeCoin
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
            swapSlippage: slippage,
        })
        // we attach the swap amount to the txb
        if (!feeChangeCoin) {
            throw new Error("Fee change coin is required")
        }
        const coins = await this.suiCoinManagerService.consolidateCoins({
            suiClient: this.suiClients[network][0],
            txb: txbAfterAttachFee,
            owner: accountAddress,
            coinType: tokenIn.tokenAddress,
            requiredAmount: swapAmount,
            providedCoins: [feeChangeCoin]
        })
        if (!coins) {
            throw new Error("Coins are required")
        }
        const { spendCoin, changeCoin } = coins
        const { txb: txbAfterSwap, extraObj } = await this.suiSwapService.swap({
            txb: txbAfterAttachFee,
            tokenIn: tokenAId,
            tokenOut: tokenBId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            inputCoinObj: spendCoin,
            transferCoinObjs: false,
        })
        const coinOut = (extraObj as { coinOut: TransactionObjectArgument }).coinOut
        // we process add liquidity
        const providedAmountA = priorityAOverB ? remainAmount : receiveAmount
        const providedAmountB = priorityAOverB ? receiveAmount : remainAmount
        if (!changeCoin || !coinOut) {
            throw new Error("Coin out or change coin is missing")
        }
        const providedCoinAmountA = priorityAOverB ? changeCoin : coinOut
        const providedCoinAmountB = priorityAOverB ? coinOut : changeCoin
        const txbAfterOpenPosition = await turbosSdk.pool.addLiquidity({
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
    }: ClosePositionParams): Promise<ActionResponse> {
        // maximum slippage to ensure the transaction is successful
        const slippage = 99.99
        const { txb: txbAfter, coinA, coinB } = 
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
        return {
            txb: txbAfter,
            extraObj: {
                coinA,
                coinB,
            }
        }       
    }
}

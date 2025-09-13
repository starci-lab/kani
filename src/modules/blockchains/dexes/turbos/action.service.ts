import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { computeDenomination, computeRatio, computeRaw, Network, toUnit, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils/tick-manager.service"
import { ActionResponse } from "../../dexes"
import { FeeToService, TickMathService } from "../../utils"
import { BN } from "bn.js"
import Decimal from "decimal.js"
import { TurbosZapService } from "./zap.service"
import { PythService } from "@modules/blockchains"
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
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId,
            tokenBId,
            chainId: tokenA.chainId,
            network,
            tokens,
        })
        const { 
            txb: txbAfterAttachFee, 
            remainingAmount
        } = await this.feeToService.attachSuiFee({
            txb,
            tokenAddress: tokenA.tokenAddress,
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
        const { swapAmount, priceImpact, receiveAmount, remainAmount, routerId, quoteData } = 
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
        console.log(
            `swap: ${computeDenomination(swapAmount, tokenB.decimals).toString()}, priceImpact: ${priceImpact.toString()}, receiveAmount: ${computeDenomination(receiveAmount, tokenA.decimals).toString()}, remainAmount: ${computeDenomination(remainAmount, tokenB.decimals).toString()}, routerId: ${routerId}, quoteData: ${quoteData}`
        )
        return {
            txb: txbAfterAttachFee
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

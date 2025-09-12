import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { computeDenomination, computeRatio, computeRaw, Network, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils/tick-manager.service"
import { ActionResponse } from "../../types"
import { FeeToService, ZapCalculatorService } from "../../utils"
import { SuiSwapService } from "../../swap"
import { BN } from "bn.js"
import Decimal from "decimal.js"
@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
        private readonly suiSwapService: SuiSwapService,
        private readonly tickManagerService: TickManagerService,
        private readonly feeToService: FeeToService,
        private readonly zapCalculatorService: ZapCalculatorService,
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
        console.log(`Amount A Remaining: ${remainingAmount.toString()}`)
        const ratio = computeRatio(
            new BN(amountB).mul(new BN(10).pow(new BN(tokenB.decimals))), 
            new BN(amountA).mul(new BN(10).pow(new BN(tokenA.decimals)))
        )
        const { receiveAmount, remainAmount, swapAmount } = 
        this.zapCalculatorService.calculateZapAmounts({
            amountIn: remainingAmount,
            ratio: new Decimal(ratio),
            currentSqrtPrice: pool.currentSqrtPrice,
            priorityAOverB,
        })
        // with this ratio, we can calculate the amount of tokenA and tokenB to add
        // call X is the amount of A => ratio x X is the amount of B
        // so that amount to add is (amount - X) A, ratio x X B
        console.log(`swap: ${computeDenomination(swapAmount, tokenB.decimals).toString()}, remain: ${computeDenomination(remainAmount, tokenB.decimals).toString()}, recv: ${computeDenomination(receiveAmount, tokenA.decimals).toString()}`)
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

import { Injectable } from "@nestjs/common"
import {
    ComputeZapAmountsParams,
    ComputeZapAmountsResponse,
    IZapService,
} from "../interfaces"
import { ZapCalculatorService } from "../../utils"
import { SuiSwapService } from "../../swap"
import { computeRatio, toScaledBN, toUnit } from "@modules/common"
import Decimal from "decimal.js"
import BN from "bn.js"
import { RetryService } from "@modules/mixin"

@Injectable()
export class TurbosZapService implements IZapService {
    constructor(
        private readonly suiSwapService: SuiSwapService,
        private readonly zapCalculatorService: ZapCalculatorService,
        private readonly retryService: RetryService,
    ) { }

    async computeZapAmounts(
        params: ComputeZapAmountsParams,
    ): Promise<ComputeZapAmountsResponse> {
        const {
            tokenAId,
            tokenBId,
            tokens,
            network,
            priorityAOverB,
            ratio,
            slippage = 0.01,
            swapSlippage = 0.01,
        } = params

        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }

        const tokenIn = priorityAOverB ? tokenA : tokenB
        const tokenOut = priorityAOverB ? tokenB : tokenA

        // Base zap calculation
        const { swapAmount, remainAmount, receiveAmount } =
            this.zapCalculatorService.calculateZapAmounts({
                ...params,
                decimalsA: tokenA.decimals,
                decimalsB: tokenB.decimals,
            })

        // Retry quote with deviation & slippage check
        const { finalReceive, routerId, quoteData, priceImpact } =
            await this.retryService.retry({
                maxRetries: 10,
                delay: 200,
                action: async () => {
                    const { amountOut, routerId, quoteData } =
                        await this.suiSwapService.quote({
                            amountIn: swapAmount,
                            tokenIn: tokenIn.displayId,
                            tokenOut: tokenOut.displayId,
                            tokens,
                            network,
                        })

                    const minAmountOut = toScaledBN(
                        receiveAmount,
                        new Decimal(1).minus(swapSlippage),
                    )
                    if (amountOut.lt(minAmountOut)) {
                        throw new Error(
                            `Quote amount too low: got=${amountOut.toString()} min=${minAmountOut.toString()}`,
                        )
                    }
                    // Ensure BN for raw units
                    const finalReceive = new BN(amountOut.toString())

                    // Final token amounts
                    const amountAFinal = priorityAOverB ? remainAmount : finalReceive
                    const amountBFinal = priorityAOverB ? finalReceive : remainAmount

                    // Actual ratio (normalize decimals)
                    const actualRatio = computeRatio(
                        new BN(amountBFinal.toString()).mul(toUnit(tokenA.decimals)),
                        new BN(amountAFinal.toString()).mul(toUnit(tokenB.decimals)),
                    )

                    // Price impact
                    const priceImpact = new Decimal(ratio).sub(actualRatio).div(ratio)
                    if (priceImpact.gt(slippage)) {
                        throw new Error("Price impact too high")
                    }
                    return { finalReceive, routerId, quoteData, priceImpact }
                },
            })

        return {
            swapAmount,
            remainAmount,
            receiveAmount: finalReceive,
            routerId,
            priceImpact,
            quoteData,
        }
    }
}

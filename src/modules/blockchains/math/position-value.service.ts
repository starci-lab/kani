import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PriceService 
} from "./price.service"
import {
    TokenSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    toDecimalAmount 
} from "@modules/utils"
import {
    AsyncService 
} from "@modules/mixin"
import {
    CalculatePositionValueParams,
    CalculatePositionValueResult
} from "./types"

/**
 * Service for calculating the value of a position based on balance changes.
 * Computes position value differences and converts to USD using token prices.
 *
 * @example
 * const service = new PositionValueService(...)
 * const result = await service.calculatePositionValue({ before, after, targetToken, quoteToken, gasToken })
 */
@Injectable()
export class PositionValueService {
    constructor(
        private readonly priceService: PriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Calculates the value of a position based on balance changes.
     * Computes differences in target, quote, gas, and incentive token balances,
     * converts all values to target token denomination, then to USD.
     *
     * @param param - Parameters for calculating position value
     * @param param.before - Balance amounts before the position change
     * @param param.after - Balance amounts after the position change
     * @param param.targetToken - Target token schema
     * @param param.quoteToken - Quote token schema
     * @param param.gasToken - Gas token schema
     * @returns Position value calculation result with values in target token and USD
     *
     * @example
     * const result = await service.calculatePositionValue({ before, after, targetToken, quoteToken, gasToken })
     */
    async calculatePositionValue({
        before,
        after,
        targetToken,
        quoteToken,
        gasToken,
    }: CalculatePositionValueParams): Promise<CalculatePositionValueResult> {
        // Resolve relative prices
        const { price: relativeQuotePrice } =
            await this.priceService.resolveRelativePrice({
                tokenA: quoteToken,
                tokenB: targetToken,
            })

        const { price: relativeGasPrice } =
            await this.priceService.resolveRelativePrice({
                tokenA: gasToken,
                tokenB: targetToken,
            })

        // ===== Target token diff =====
        const targetBalanceAmount = toDecimalAmount({
            amount: before.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        })

        const targetBalanceAmountAfter = toDecimalAmount({
            amount: after.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        })

        const targetBalanceAmountDiff =
            targetBalanceAmountAfter.sub(targetBalanceAmount)

        // ===== Quote token diff (convert to target) =====
        const quoteBalanceAmount = toDecimalAmount({
            amount: before.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)

        const quoteBalanceAmountAfter = toDecimalAmount({
            amount: after.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)

        const quoteBalanceAmountDiff =
            quoteBalanceAmountAfter.sub(quoteBalanceAmount)

        // ===== Gas token diff (convert to target) =====
        const gasBalanceAmount = toDecimalAmount({
            amount: before.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)

        const gasBalanceAmountAfter = toDecimalAmount({
            amount: after.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)

        const gasBalanceAmountDiff =
            gasBalanceAmountAfter.sub(gasBalanceAmount)

        // ===== Incentive token diffs (convert to target) =====
        const incentiveDiffs = await this.asyncService.allMustDone(
            Object.entries(before.incentiveBalanceAmounts ?? {
            }).map(
                async ([tokenId,
                    beforeAmount]) => {
                    const afterAmount =
                        after.incentiveBalanceAmounts?.[tokenId] ?? new BN(0)

                    const incentiveToken =
                        this.primaryMemoryStorageService.tokenCollection.findOne({
                            id: {
                                $eq: tokenId 
                            },
                        })

                    if (!incentiveToken) {
                        return new Decimal(0)
                    }

                    const { price: relativeIncentivePrice } =
                        await this.priceService.resolveRelativePrice({
                            tokenA: incentiveToken,
                            tokenB: targetToken,
                        })
                    const beforeDecimal = toDecimalAmount({
                        amount: beforeAmount,
                        decimals: new Decimal(incentiveToken.decimals),
                    }).mul(relativeIncentivePrice)
                    
                    const afterDecimal = toDecimalAmount({
                        amount: afterAmount,
                        decimals: new Decimal(incentiveToken.decimals),
                    }).mul(relativeIncentivePrice)

                    return afterDecimal.sub(beforeDecimal)
                }
            )
        )

        const incentiveTotalDiff = incentiveDiffs.reduce(
            (acc, value) => acc.add(value),
            new Decimal(0)
        )

        // ===== Total position value (target token) =====
        const positionValue = targetBalanceAmountDiff
            .add(quoteBalanceAmountDiff)
            .add(gasBalanceAmountDiff)
            .add(incentiveTotalDiff)
            .abs()

        // ===== Convert to USD =====
        const { price: targetPrice } =
            await this.priceService.resolvePrice({
                token: targetToken,
            })

        const balanceValue = targetBalanceAmount
            .add(quoteBalanceAmount)
            .add(gasBalanceAmount)

        const balanceValueInUsd = balanceValue.mul(targetPrice)
        const positionValueInUsd = positionValue.mul(targetPrice)

        return {
            positionValue,
            positionValueInUsd,
            balanceValue,
            balanceValueInUsd,
        }
    }
}

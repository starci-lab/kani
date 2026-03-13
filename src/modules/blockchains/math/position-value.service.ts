import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PriceService
} from "./price.service"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    toDecimalAmount
} from "@modules/common"
import {
    AsyncService
} from "@modules/mixin"
import {
    CalculatePositionValueParams,
    CalculatePositionValueResult,
} from "./types"
import {
    TokenSchema
} from "@modules/databases"

/**
 * Service responsible for calculating position value and balance value.
 *
 * All token amounts are converted into the target token denomination first,
 * then converted into USD using the target token price.
 *
 * Position value = absolute delta of total portfolio value (in target token).
 * Balance value  = total portfolio value before position change (in target token).
 */
@Injectable()
export class PositionValueService {
    constructor(
        private readonly priceService: PriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
   * Converts a map of incentive token balances into a single aggregated value
   * denominated in the target token.
   *
   * Each incentive token is:
   * 1. Converted from raw amount (BN) into decimal amount.
   * 2. Converted into target token denomination using relative price.
   * 3. Summed into a total value.
   *
   * @returns Total incentive value expressed in target token.
   */
    private async resolveIncentivesValueInTarget(
        targetToken: TokenSchema,
        incentiveBalanceAmounts?: Record<string, BN>,
    ): Promise<Decimal> {
        const map = incentiveBalanceAmounts ?? {
        }
        const tokenIds = Object.keys(map)

        if (tokenIds.length === 0) {
            return new Decimal(0)
        }

        const values = await this.asyncService.allMustDone(
            tokenIds.map(async (tokenId) => {
                const amount = map[tokenId] ?? new BN(0)

                if (amount.isZero()) {
                    return new Decimal(0)
                }

                // Retrieve incentive token metadata from memory storage
                const incentiveToken = this.primaryMemoryStorageService.tokenMap.get(tokenId)

                if (!incentiveToken) {
                    return new Decimal(0)
                }

                // Resolve relative price between incentive token and target token
                const { price: relativeIncentivePrice } =
                    await this.priceService.resolveRelativePrice({
                        tokenA: incentiveToken,
                        tokenB: targetToken,
                    })

                // Convert raw amount -> decimal -> target denomination
                return toDecimalAmount({
                    amount,
                    decimals: new Decimal(incentiveToken.decimals),
                }).mul(relativeIncentivePrice)
            }),
        )

        // Aggregate all incentive values
        return values.reduce((acc, v) => acc.add(v),
            new Decimal(0))
    }

    /**
   * Calculates position value change and balance value.
   *
   * Steps:
   * 1. Convert target, quote, gas balances into target denomination.
   * 2. Convert incentive token balances into target denomination.
   * 3. Compute delta between before and after states.
   * 4. Convert results into USD.
   *
   * @returns
   * - positionValue: absolute portfolio delta in target token
   * - positionValueInUsd: absolute portfolio delta in USD
   * - balanceValue: portfolio value before change (in target token)
   * - balanceValueInUsd: portfolio value before change (in USD)
   */
    async calculatePositionValue({
        before,
        after,
        targetToken,
        quoteToken,
        gasToken,
        isClose,
    }: CalculatePositionValueParams): Promise<CalculatePositionValueResult> {
        // Resolve relative prices for quote and gas tokens
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

        // ===== Target token balances =====
        const targetBalanceBefore = toDecimalAmount({
            amount: before.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        })

        const targetBalanceAfter = toDecimalAmount({
            amount: after.targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        })

        const targetBalanceDiff = targetBalanceAfter.sub(targetBalanceBefore)

        // ===== Quote token balances (converted into target token) =====
        const quoteBalanceBefore = toDecimalAmount({
            amount: before.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)

        const quoteBalanceAfter = toDecimalAmount({
            amount: after.quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)

        const quoteBalanceDiff = quoteBalanceAfter.sub(quoteBalanceBefore)

        // ===== Gas token balances (converted into target token) =====
        const gasBalanceBefore = toDecimalAmount({
            amount: before.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)

        const gasBalanceAfter = toDecimalAmount({
            amount: after.gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)

        const gasBalanceDiff = gasBalanceAfter.sub(gasBalanceBefore)
        // ===== Incentive token balances =====
        const incentiveTotalBefore =
            await this.resolveIncentivesValueInTarget(targetToken,
                before.incentiveBalanceAmounts)

        const incentiveTotalAfter =
            await this.resolveIncentivesValueInTarget(targetToken,
                after.incentiveBalanceAmounts)

        const incentiveTotalDiff =
            incentiveTotalAfter.sub(incentiveTotalBefore)
        // ===== Position value (absolute portfolio delta) =====
        const positionValue = targetBalanceDiff
            .add(quoteBalanceDiff)
            .add(gasBalanceDiff)
            .add(incentiveTotalDiff)
            .abs()

        // ===== Total portfolio value BEFORE change =====
        const balanceValue = !isClose ? (
            targetBalanceBefore
                .add(quoteBalanceBefore)
                .add(gasBalanceBefore)
                .add(incentiveTotalBefore)
        ) : (
            targetBalanceAfter
                .add(quoteBalanceAfter)
                .add(gasBalanceAfter)
                .add(incentiveTotalAfter)
        )
        // ===== Convert to USD using target token price =====
        const { price: targetPrice } =
            await this.priceService.resolvePrice({
                token: targetToken,
            })

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

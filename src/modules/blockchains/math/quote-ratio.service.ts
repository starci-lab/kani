import {
    QuoteRatioStatus
} from "@modules/databases"
import {
    Injectable
} from "@nestjs/common"
import {
    ComputeQuoteRatioParams, ComputeQuoteRatioResult
} from "./swap.service"
import {
    toDecimalAmount
} from "@modules/utils"
import {
    Decimal
} from "decimal.js"
import {
    PriceService
} from "./price.service"
import {
    envConfig
} from "@modules/env"

@Injectable()
export class QuoteRatioService {
    constructor(
        private readonly priceService: PriceService,
    ) { }

    /**
    * Computes the ratio of target token value within a two-token portfolio.
    *
    * Formula:
    *  - targetValue   = targetBalance
    *  - quoteValue    = quoteBalance / relativePrice
    *  - totalValue    = targetValue + quoteValue
    *  - quoteRatio    = targetValue / totalValue
    *
    * Where:
    *  - All balances are first normalized by token decimals
    *  - All values are denominated in the target token
    *  - relativePrice represents the price of quote token in terms of target token
    */
    public async computeQuoteRatio(
        {
            targetToken,
            quoteToken,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ComputeQuoteRatioParams
    ): Promise<ComputeQuoteRatioResult> {

        // Resolve relative price: how many quote tokens equal 1 target token
        const { price: relativePrice } = await this.priceService.resolveRelativePrice({
            tokenA: targetToken,
            tokenB: quoteToken,
        })

        // Convert target token balance to decimal value (denominated in target token)
        const targetBalanceInTargetAmount = toDecimalAmount({
            amount: targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        })

        // Convert quote token balance to decimal, then reprice into target token value
        const quoteBalanceInTargetAmount = toDecimalAmount({
            amount: quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).div(relativePrice)

        // Total portfolio value denominated in target token
        const totalBalanceInTargetAmount =
            targetBalanceInTargetAmount.add(quoteBalanceInTargetAmount)

        // Ratio of target token value relative to total portfolio value
        const quoteRatio =
            targetBalanceInTargetAmount.div(totalBalanceInTargetAmount)

        // Return computed ratio and intermediate values (all denominated in target token)
        return {
            quoteRatio,
            totalBalanceInTargetAmount,
            targetBalanceInTargetAmount,
            quoteBalanceInTargetAmount,
            relativePrice,
        }
    }

    /**
 * Determines the portfolio status based on the target token quote ratio.
 *
 * Logic:
 *  - If quoteRatio > safe.above  → target token is overweighted
 *  - If quoteRatio < safe.below  → target token is underweighted
 *  - Otherwise                  → ratio is within the acceptable range
 *
 * Where:
 *  - quoteRatio represents the proportion of target token value
 *    relative to the total portfolio value
 *  - safe.above and safe.below define the allowed ratio band
 *
 * This check is typically used for rebalancing decisions,
 * liquidity safety checks, or swap / routing validation.
 */
    public checkQuoteRatioStatus(
        {
            quoteRatio,
        }: CheckQuoteRatioStatusParams
    ): QuoteRatioStatus {
        // check if the quote ratio is overweighted
        if (quoteRatio.gt(envConfig().quote.ratio.safe.above)) {
            return QuoteRatioStatus.TargetOverweighted
        }

        // check if the quote ratio is underweighted
        if (quoteRatio.lt(envConfig().quote.ratio.safe.below)) {
            return QuoteRatioStatus.TargetUnderweighted
        }

        // if the quote ratio is within the acceptable range, return good
        return QuoteRatioStatus.Good
    }
}

export interface CheckQuoteRatioStatusParams {
    quoteRatio: Decimal
}
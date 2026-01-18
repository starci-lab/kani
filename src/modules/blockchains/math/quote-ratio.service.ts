import {
    PrimaryMemoryStorageService, QuoteRatioStatus 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    ComputeQuoteRatioParams, ComputeQuoteRatioResult 
} from "./swap.service"
import {
    TokenNotFoundException 
} from "@exceptions"
import {
    computeDenomination 
} from "@utils"
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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
    ) {}

    public async computeQuoteRatio(
        {
            targetTokenId,
            quoteTokenId,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ComputeQuoteRatioParams
    ): Promise<ComputeQuoteRatioResult> {
        const targetToken = this.primaryMemoryStorageService
            .tokenCollection.findOne({
                displayId: {
                    $eq: targetTokenId
                }
            })
        if (!targetToken) {
            throw new TokenNotFoundException({
                displayId: targetTokenId
            })
        }
        const quoteToken = this.primaryMemoryStorageService
            .tokenCollection.findOne({
                displayId: {
                    $eq: quoteTokenId
                }
            })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                displayId: quoteTokenId
            })
        }
        const { price: relativePrice } = await this.priceService.resolveRelativePrice(
            {
                tokenAId: targetToken.displayId,
                tokenBId: quoteToken.displayId,
            }
        )
        const targetBalanceAmountInQuote = computeDenomination(
            targetBalanceAmount,
            targetToken.decimals
        ).mul(relativePrice)
        const quoteBalanceAmountInQuote = computeDenomination(
            quoteBalanceAmount,
            quoteToken.decimals
        )
        const totalBalanceAmountInQuote = targetBalanceAmountInQuote.add(quoteBalanceAmountInQuote)
        const quoteRatio = quoteBalanceAmountInQuote.div(totalBalanceAmountInQuote)
        return {
            quoteRatio,
            totalBalanceAmountInQuote,
            targetBalanceAmountInQuote,
            quoteBalanceAmountInQuote,
            relativePrice,
        }
    }

    public checkQuoteRatioStatus(
        {
            quoteRatio,
        }: CheckQuoteRatioStatusParams
    ): QuoteRatioStatus {
        if (quoteRatio.gt(envConfig().quote.ratio.safe.above)) {
            return QuoteRatioStatus.TargetTooLow
        }
        if (quoteRatio.lt(envConfig().quote.ratio.safe.below)) {
            return QuoteRatioStatus.TargetTooHigh
        }
        return QuoteRatioStatus.Good
    }
}   

export interface CheckQuoteRatioStatusParams {
    quoteRatio: Decimal
}
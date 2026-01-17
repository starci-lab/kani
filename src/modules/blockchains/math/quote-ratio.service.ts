import { PrimaryMemoryStorageService, QuoteRatioStatus } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { ComputeQuoteRatioParams, ComputeQuoteRatioResult } from "./swap.service"
import { TokenNotFoundException } from "@exceptions"
import { computeDenomination } from "@utils"
import { SAFE_QUOTE_RATIO_ABOVE, SAFE_QUOTE_RATIO_BELOW } from "."
import { Decimal } from "decimal.js"
import { PriceService } from "./price.service"

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
            .tokens.find(token => token.displayId === targetTokenId)
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService
            .tokens.find(token => token.displayId === quoteTokenId)
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
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
        if (quoteRatio.gt(SAFE_QUOTE_RATIO_ABOVE)) {
            return QuoteRatioStatus.TargetTooLow
        }
        if (quoteRatio.lt(SAFE_QUOTE_RATIO_BELOW)) {
            return QuoteRatioStatus.TargetTooHigh
        }
        return QuoteRatioStatus.Good
    }
}   

export interface CheckQuoteRatioStatusParams {
    quoteRatio: Decimal
}
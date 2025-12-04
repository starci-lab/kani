import { PrimaryMemoryStorageService, QuoteRatioStatus } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { ComputeQuoteRatioParams, ComputeQuoteRatioResponse } from "./swap.service"
import { TokenNotFoundException } from "@exceptions"
import { computeDenomination } from "@utils"
import { OraclePriceService } from "../pyth"
import { SAFE_QUOTE_RATIO_ABOVE, SAFE_QUOTE_RATIO_BELOW } from "."
import { Decimal } from "decimal.js"

@Injectable()
export class QuoteRatioService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly oraclePriceService: OraclePriceService,
    ) {}

    public async computeQuoteRatio(
        {
            targetTokenId,
            quoteTokenId,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ComputeQuoteRatioParams
    ): Promise<ComputeQuoteRatioResponse> {
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
        const oraclePrice = await this.oraclePriceService.getOraclePrice({
            tokenA: targetToken.displayId,
            tokenB: quoteToken.displayId,
        })
        const targetBalanceAmountInQuote = computeDenomination(
            targetBalanceAmount,
            targetToken.decimals
        ).mul(oraclePrice)
        const quoteBalanceAmountInQuote = computeDenomination(
            quoteBalanceAmount,
            quoteToken.decimals
        )
        console.log("targetBalanceAmountInQuote", targetBalanceAmountInQuote.toString())
        console.log("quoteBalanceAmountInQuote", quoteBalanceAmountInQuote.toString())
        const totalBalanceAmountInQuote = targetBalanceAmountInQuote.add(quoteBalanceAmountInQuote)
        console.log("totalBalanceAmountInQuote", totalBalanceAmountInQuote.toString())
        const quoteRatio = quoteBalanceAmountInQuote.div(totalBalanceAmountInQuote)
        console.log("quoteRatio", quoteRatio.toString())
        return {
            quoteRatio,
            totalBalanceAmountInQuote,
            targetBalanceAmountInQuote,
            quoteBalanceAmountInQuote,
            oraclePrice,
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
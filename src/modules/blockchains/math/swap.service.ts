import { 
    TargetOperationalGasAmountNotFoundException, 
    TokenNotFoundException,
    GasBalanceAmountNotFoundException,
    MinOperationalGasAmountNotFoundException,
    InsufficientMinGasBalanceAmountException
} from "@exceptions"
import { PrimaryMemoryStorageService, QuoteRatioStatus, TokenId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Decimal } from "decimal.js"
import { computeRaw, toScaledBN, toUnit } from "@utils"
import { ChainId, TokenType } from "@typedefs"
import BN from "bn.js"
import { QuoteRatioService } from "./quote-ratio.service"
import { GasStatus } from "../types"
import { SAFE_QUOTE_RATIO_BELOW, SAFE_QUOTE_RATIO_ABOVE, EXPECTED_QUOTE_RATIO_BELOW, EXPECTED_QUOTE_RATIO_ABOVE } from "./constants"

@Injectable()
export class SwapMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly quoteRatioService: QuoteRatioService,
    ) {}

    
    private async computeSwapAmountsWhenTargetIsGas(
        {
            targetTokenId,
            quoteTokenId,
            quoteRatioResponse,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResponse> {
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
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResponse.quoteRatio,
        })
        // Compute the quote ratio
        switch (quoteRatioStatus)    {
        case QuoteRatioStatus.Good: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            // target is too much, we need to swap from target to quote
            const idealQuoteBalanceInQuote = quoteRatioResponse.totalBalanceAmountInQuote.mul(EXPECTED_QUOTE_RATIO_BELOW)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResponse.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResponse.oraclePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: quoteShortfallInQuoteBN,
                quoteRatioStatus: QuoteRatioStatus.TargetTooLow,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            // target is too little, we need to swap from quote to target
            const idealQuoteBalanceInQuote = quoteRatioResponse.totalBalanceAmountInQuote.mul(EXPECTED_QUOTE_RATIO_ABOVE)
            const excessQuoteInQuote = quoteRatioResponse.quoteBalanceAmountInQuote.sub(idealQuoteBalanceInQuote)
            const excessQuoteInQuoteBN = new BN(
                computeRaw(new Decimal(excessQuoteInQuote), quoteToken.decimals)
            )
            const estimatedSwappedTargetAmount = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResponse.oraclePrice)
                ))
                .mul(excessQuoteInQuoteBN).div(toUnit(quoteToken.decimals))
            // quote is too much, we need to swap from quote to target
            return {
                processSwaps: true,
                swapQuoteToTargetAmount: excessQuoteInQuoteBN,
                estimatedSwappedTargetAmount,
                quoteRatioStatus: QuoteRatioStatus.TargetTooHigh,
                quoteRatioResponse,
            }
        }
        }
    }

    private async computeSwapAmountsWhenTargetIsQuote(
        {
            targetTokenId,
            quoteTokenId,
            quoteRatioResponse,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResponse> {
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
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResponse.quoteRatio,
        })
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            // quote is too little, we need to swap from target to quote
            const idealQuoteBalanceInQuote = quoteRatioResponse.totalBalanceAmountInQuote.mul(SAFE_QUOTE_RATIO_BELOW)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResponse.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResponse.oraclePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                quoteRatioStatus,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: targetBalanceAmountSwapToQuote,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            const idealQuoteBalanceInQuote = quoteRatioResponse.totalBalanceAmountInQuote.mul(SAFE_QUOTE_RATIO_ABOVE)
            const excessQuoteInQuote = quoteRatioResponse.quoteBalanceAmountInQuote.sub(idealQuoteBalanceInQuote)
            const excessQuoteInQuoteBN = new BN(
                computeRaw(new Decimal(excessQuoteInQuote), quoteToken.decimals)
            )
            const quoteToTargetSwapAmount = toScaledBN(
                toUnit(quoteToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResponse.oraclePrice))
            )
            // quote is too much, we need to swap from quote to target
            return {
                processSwaps: true,
                quoteRatioStatus,
                swapQuoteToTargetAmount: excessQuoteInQuoteBN,
                estimatedSwappedTargetAmount: quoteToTargetSwapAmount,
                quoteRatioResponse,
            }
        }
        }
    }

    private async computeSwapAmountsWhenNeitherTargetNorQuoteIsGas(
        {
            targetTokenId,
            quoteTokenId,
            gasBalanceAmount,
            quoteRatioResponse,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResponse> {
        const chainId = ChainId.Solana
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
        const gasToken = this.primaryMemoryStorageService
            .tokens.find(token => token.type === TokenType.Native 
                && token.chainId === chainId
            )
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        const targetOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.targetOperationalAmount
        const minOperationalGasAmount = this.primaryMemoryStorageService
            .gasConfig.gasAmountRequired?.[chainId]?.minOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                chainId, 
                "Target operational gas amount not found"
            )
        }
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                chainId, 
                "Quote operational gas amount not found"
            )
        }
        if (!gasBalanceAmount) {
            throw new GasBalanceAmountNotFoundException(
                chainId, 
                "Gas balance amount not found"
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResponse.quoteRatio,
        })
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            // good ratio, no need to swap between target to quote or quote to target
            // but we must ensure that gas amount is enough, or >= target operational gas amount
            if (gasBalanceAmount.gte(targetOperationalGasAmountBN)) {
                return {
                    processSwaps: false,
                    quoteRatioStatus,
                    quoteRatioResponse,
                }
            }
            if (gasBalanceAmount.lt(minOperationalGasAmountBN)) {
                throw new InsufficientMinGasBalanceAmountException(
                    chainId, 
                    "Gas balance amount is insufficient"
                )
            }
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            const idealQuoteBalanceInQuote = quoteRatioResponse.totalBalanceAmountInQuote.mul(SAFE_QUOTE_RATIO_BELOW)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResponse.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResponse.oraclePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: quoteShortfallInQuoteBN,
                quoteRatioStatus,
                quoteRatioResponse,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResponse,
            }
        }
        }
    }

    public async computeSwapAmounts(
        {
            targetTokenId,
            quoteTokenId,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        }: ComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResponse> {
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
        let gasStatus = GasStatus.IsGas
        if (targetToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsTarget
        } else if (quoteToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsQuote
        }
        const quoteRatioResponse = await this.quoteRatioService.computeQuoteRatio({
            targetTokenId,
            quoteTokenId,
            targetBalanceAmount,
            quoteBalanceAmount,
        })
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            return this.computeSwapAmountsWhenTargetIsGas({
                targetTokenId,
                quoteTokenId,
                quoteRatioResponse,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsQuote: {
            return this.computeSwapAmountsWhenTargetIsQuote({
                targetTokenId,
                quoteTokenId,
                quoteRatioResponse,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsGas: {
            return this.computeSwapAmountsWhenNeitherTargetNorQuoteIsGas({
                targetTokenId,
                quoteTokenId,
                quoteRatioResponse,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        }
    }
}

export interface ComputeSwapAmountsParams {
    targetTokenId: TokenId
    quoteTokenId: TokenId
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount?: BN
}

export interface ComputeSwapAmountsResponse {
    // processSwaps, means whether we need to swap between target to quote or quote to target
    processSwaps: boolean
    quoteRatioStatus: QuoteRatioStatus
    // Quote ratio
    quoteRatioResponse: ComputeQuoteRatioResponse
    // Amounts of tokens that will be swapped
    swapTargetToQuoteAmount?: BN
    swapQuoteToTargetAmount?: BN
    swapTargetToGasAmount?: BN
    swapQuoteToGasAmount?: BN
    // Estimated amounts of tokens that will be swapped
    estimatedSwappedQuoteAmount?: BN
    estimatedSwappedTargetAmount?: BN
    estimatedSwappedGasAmount?: BN
    // Remaining amounts of tokens after swapping
    remainingTargetBalanceAmount?: BN
    remainingQuoteBalanceAmount?: BN
}

export interface ComputeQuoteRatioParams {
    targetTokenId: TokenId
    quoteTokenId: TokenId
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ComputeQuoteRatioResponse {
    quoteRatio: Decimal
    totalBalanceAmountInQuote: Decimal
    targetBalanceAmountInQuote: Decimal
    quoteBalanceAmountInQuote: Decimal
    oraclePrice: Decimal
}

export interface ExtendedComputeSwapAmountsParams extends ComputeSwapAmountsParams {
    quoteRatioResponse: ComputeQuoteRatioResponse
}
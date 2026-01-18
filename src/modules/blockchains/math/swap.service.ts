import { 
    TargetOperationalGasAmountNotFoundException, 
    TokenNotFoundException,
    MinOperationalGasAmountNotFoundException,
    AdditionalSwapAmountGasNotFoundException,
    SwapThresholdGasAmountNotFoundException,
} from "@exceptions"
import { 
    PrimaryMemoryStorageService, 
    QuoteRatioStatus, 
    TokenId, 
    TokenSchema
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Decimal 
} from "decimal.js"
import {
    computeRaw, toScaledBN, toUnit 
} from "@utils"
import {
    ChainId, TokenType 
} from "@typedefs"
import BN from "bn.js"
import {
    QuoteRatioService 
} from "./quote-ratio.service"
import {
    GasStatus 
} from "../types"
import {
    envConfig 
} from "@modules/env"

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
            quoteRatioResult,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
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
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResult.quoteRatio,
        })
        // Compute the quote ratio
        switch (quoteRatioStatus)    {
        case QuoteRatioStatus.Good: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            // target is too much, we need to swap from target to quote
            const idealQuoteBalanceInQuote = quoteRatioResult.totalBalanceAmountInQuote.mul(envConfig().quote.ratio.expected.below)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResult.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResult.relativePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: quoteShortfallInQuoteBN,
                quoteRatioStatus: QuoteRatioStatus.TargetTooLow,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            // target is too little, we need to swap from quote to target
            const idealQuoteBalanceInQuote = quoteRatioResult.totalBalanceAmountInQuote.mul(envConfig().quote.ratio.expected.above)
            const excessQuoteInQuote = quoteRatioResult.quoteBalanceAmountInQuote.sub(idealQuoteBalanceInQuote)
            const excessQuoteInQuoteBN = new BN(
                computeRaw(new Decimal(excessQuoteInQuote),
                    quoteToken.decimals)
            )
            const estimatedSwappedTargetAmount = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResult.relativePrice)
                ))
                .mul(excessQuoteInQuoteBN).div(toUnit(quoteToken.decimals))
            // quote is too much, we need to swap from quote to target
            return {
                processSwaps: true,
                swapQuoteToTargetAmount: excessQuoteInQuoteBN,
                estimatedSwappedTargetAmount,
                quoteRatioStatus: QuoteRatioStatus.TargetTooHigh,
                quoteRatioResult,
            }
        }
        }
    }

    private async computeSwapAmountsWhenTargetIsQuote(
        {
            targetTokenId,
            quoteTokenId,
            quoteRatioResult,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
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
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResult.quoteRatio,
        })
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            // quote is too little, we need to swap from target to quote
            const idealQuoteBalanceInQuote = quoteRatioResult.totalBalanceAmountInQuote.mul(envConfig().quote.ratio.safe.below)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResult.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResult.relativePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                quoteRatioStatus,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: targetBalanceAmountSwapToQuote,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            const idealQuoteBalanceInQuote = quoteRatioResult.totalBalanceAmountInQuote.mul(envConfig().quote.ratio.safe.above)
            const excessQuoteInQuote = quoteRatioResult.quoteBalanceAmountInQuote.sub(idealQuoteBalanceInQuote)
            const excessQuoteInQuoteBN = new BN(
                computeRaw(new Decimal(excessQuoteInQuote),
                    quoteToken.decimals)
            )
            const quoteToTargetSwapAmount = toScaledBN(
                toUnit(quoteToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResult.relativePrice))
            )
            // quote is too much, we need to swap from quote to target
            return {
                processSwaps: true,
                quoteRatioStatus,
                swapQuoteToTargetAmount: excessQuoteInQuoteBN,
                estimatedSwappedTargetAmount: quoteToTargetSwapAmount,
                quoteRatioResult,
            }
        }
        }
    }

    private async computeSwapAmountsWhenNeitherTargetNorQuoteIsGas(
        {
            targetTokenId,
            quoteTokenId,
            gasBalanceAmount,
            quoteRatioResult,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
        const chainId = ChainId.Solana
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
        const gasToken = this.primaryMemoryStorageService
            .tokenCollection.findOne({
                type: {
                    $eq: TokenType.Native
                },
                chainId: {
                    $eq: chainId
                }
            })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    type: TokenType.Native,
                    chainId: chainId,
                },
            })
        }
        // check quote ratio status
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus(
            {
                quoteRatio: quoteRatioResult.quoteRatio,
            }
        )
        // retrieve the gas config
        const {
            minOperationalAmount: minOperationalGasAmount,
            targetOperationalAmount: targetOperationalGasAmount,
            swapThresholdAmount: swapThresholdGasAmount,
            additionalSwapAmount: additionalSwapAmountGas,
        } = this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[chainId] ?? {
        }
        // validate the gas config
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: chainId,
                }
            )
        }
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: chainId,
                }
            )
        }
        if (!swapThresholdGasAmount) {
            throw new SwapThresholdGasAmountNotFoundException(
                {
                    chainId: chainId,
                }
            )
        }
        if (!additionalSwapAmountGas) {
            throw new AdditionalSwapAmountGasNotFoundException(
                {
                    chainId: chainId,
                }
            )
        }   
        const minOperationalGasAmountBN = computeRaw(
            new Decimal(minOperationalGasAmount),
            gasToken.decimals
        )
        const swapThresholdGasAmountBN = computeRaw(
            new Decimal(swapThresholdGasAmount),
            gasToken.decimals
        )
        const additionalSwapAmountGasBN = computeRaw(
            new Decimal(additionalSwapAmountGas),
            gasToken.decimals
        )
        // whether we need to swap from either quote or target to gas
        let needsGasSwap = false
        // check gas status
        if (gasBalanceAmount.lt(swapThresholdGasAmountBN)) {
            // we have to perform a swap from either quote or target to gas
            needsGasSwap = true
        } else if (gasBalanceAmount.lt(minOperationalGasAmountBN)) {
            // do nothing, since the gas amount is not enough
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResult,
            }
        }
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            // good ratio, no need to swap between target to quote or quote to target
            // but we must ensure that gas amount is enough, or >= target operational gas amount
            if (gasBalanceAmount.gte(swapThresholdGasAmountBN)) {
                return {
                    processSwaps: false,
                    quoteRatioStatus,
                    quoteRatioResult,
                }
            }
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooLow: {
            // since this case is target too low, which means we have too much quote, so that
            if (needsGasSwap) {
                // this case mean we need to swap a partial of to gas
                const swapResult = await this.computeSwapResult(
                    {
                        amountIn: additionalSwapAmountGasBN,
                        tokenIn: gasToken,
                        tokenOut: quoteToken,
                        relativePrice: quoteRatioResult.relativePrice,
                    }
                )
                return {
                    processSwaps: true,
                    swapQuoteToGasAmount: swapResult,
                    estimatedSwappedGasAmount: swapResult,
                    quoteRatioStatus,
                    quoteRatioResult,
                }
            }
            // target too low mean, the quote is too much, we need to swap a partial of quote to the target and gas
            const idealQuoteBalanceInQuote = quoteRatioResult.totalBalanceAmountInQuote.mul(envConfig().quote.ratio.safe.below)
            const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteRatioResult.quoteBalanceAmountInQuote)
            const quoteShortfallInQuoteBN = new BN(
                computeRaw(
                    new Decimal(quoteShortfallInQuote),
                    quoteToken.decimals
                )
            )
            const targetBalanceAmountSwapToQuote = toScaledBN(
                toUnit(targetToken.decimals),
                new Decimal(1).div(new Decimal(quoteRatioResult.relativePrice)
                ))
                .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
            return {
                processSwaps: true,
                swapTargetToQuoteAmount: targetBalanceAmountSwapToQuote,
                estimatedSwappedQuoteAmount: quoteShortfallInQuoteBN,
                quoteRatioStatus,
                quoteRatioResult,
            }
        }
        case QuoteRatioStatus.TargetTooHigh: {
            return {
                processSwaps: false,
                quoteRatioStatus,
                quoteRatioResult,
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
    ): Promise<ComputeSwapAmountsResult> {
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
        let gasStatus = GasStatus.IsGas
        if (targetToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsTarget
        } else if (quoteToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsQuote
        }
        const quoteRatioResult = await this.quoteRatioService.computeQuoteRatio({
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
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsQuote: {
            return this.computeSwapAmountsWhenTargetIsQuote({
                targetTokenId,
                quoteTokenId,
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsGas: {
            return this.computeSwapAmountsWhenNeitherTargetNorQuoteIsGas({
                targetTokenId,
                quoteTokenId,
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        }
    }

    private async computeSwapResult(
        {
            amountIn,
            tokenIn,
            tokenOut,
            relativePrice,
        }: ComputeSwapResultParams
    ): Promise<BN> {
        return toScaledBN(
            toUnit(tokenIn.decimals),
            new Decimal(1).div(new Decimal(relativePrice))
        )
            .mul(amountIn).div(toUnit(tokenOut.decimals))
    }
}

export interface ComputeSwapAmountsParams {
    targetTokenId: TokenId
    quoteTokenId: TokenId
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface ComputeSwapAmountsResult {
    // processSwaps, means whether we need to swap between target to quote or quote to target
    processSwaps: boolean
    quoteRatioStatus: QuoteRatioStatus
    // Quote ratio
    quoteRatioResult: ComputeQuoteRatioResult
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

export interface ComputeQuoteRatioResult {
    quoteRatio: Decimal
    totalBalanceAmountInQuote: Decimal
    targetBalanceAmountInQuote: Decimal
    quoteBalanceAmountInQuote: Decimal
    relativePrice: Decimal
}

export interface ExtendedComputeSwapAmountsParams extends ComputeSwapAmountsParams {
    quoteRatioResult: ComputeQuoteRatioResult
}

export interface ComputeSwapResultParams {
    amountIn: BN
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    relativePrice: Decimal
}

export interface ComputeSwapResult {
    swapTargetToQuoteAmount: BN
    swapQuoteToTargetAmount: BN
}
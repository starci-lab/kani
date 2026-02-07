import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ChainId 
} from "@modules/common"

/** Metadata when the gas balance amount is insufficient. */
export interface InsufficientMinGasBalanceAmountExceptionMetadata extends AbstractExceptionMetadata {
    gasBalanceAmount: string
    minOperationalGasAmount: string
    chainId: ChainId
    botId: string
}

/** Thrown when the gas balance amount is insufficient. */
export class InsufficientMinGasBalanceAmountException extends AbstractException {
    constructor(
        { 
            gasBalanceAmount, 
            minOperationalGasAmount, 
            chainId, 
            botId,
            originalError 
        }: InsufficientMinGasBalanceAmountExceptionMetadata
    ) {
        super(
            "Insufficient minimum gas balance amount",
            "INSUFFICIENT_MIN_GAS_BALANCE_AMOUNT_EXCEPTION",
            {
                gasBalanceAmount,
                minOperationalGasAmount,
                chainId,
                botId,
                originalError,
            }
        )
    }
}

/** Metadata when the quote ratio is not good. */
export interface QuoteRatioNotGoodExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    liquidityPoolId: string
    quoteRatio: number
}

/** Thrown when the quote ratio is not good. */
export class QuoteRatioNotGoodException extends AbstractException {
    constructor(
        {
            botId,
            liquidityPoolId,
            quoteRatio,
        }: QuoteRatioNotGoodExceptionMetadata
    ) {
        super(
            "Quote ratio not good",
            "QUOTE_RATIO_NOT_GOOD_EXCEPTION",
            {
                botId,
                liquidityPoolId,
                quoteRatio,
            }
        )
    }
}
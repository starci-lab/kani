import type {
    AbstractExceptionMetadata,
} from "../abstract"
import {
    AbstractException,
} from "../abstract"
import type {
    TokenId 
} from "@modules/databases"

/** Metadata when both target and quote tokens are USDT. */
export interface BothTokensCannotBeUsdtExceptionMetadata extends AbstractExceptionMetadata {
    targetTokenId: TokenId
    quoteTokenId: TokenId
}

/** Thrown when both target and quote tokens are USDT (violate indicator cannot compute price change). */
export class BothTokensCannotBeUsdtException extends AbstractException {
    constructor(
        { targetTokenId, quoteTokenId, originalError }: BothTokensCannotBeUsdtExceptionMetadata
    ) {
        super(
            "Both target and quote tokens cannot be USDT",
            "BOTH_TOKENS_CANNOT_BE_USDT_EXCEPTION",
            {
                targetTokenId,
                quoteTokenId,
                originalError,
            }
        )
    }
}

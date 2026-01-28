import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    TokenId 
} from "@modules/databases"
/** Thrown when token cannot be found */
export interface TokenNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: TokenId
    conditions?: unknown
    tokenAddress?: string
}
export class TokenNotFoundException extends AbstractException {
    constructor(
        { id, displayId, conditions, originalError, tokenAddress }: TokenNotFoundExceptionMetadata
    ) {
        super(
            "Token not found",
            "TOKEN_NOT_FOUND_EXCEPTION",
            {
                id,
                displayId,
                conditions,
                originalError,
                tokenAddress,
            }
        )
    }
}

/** Thrown when some tokens are not found */
export interface SomeTokensNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    actualCount: number
    expectedCount: number
}
export class SomeTokensNotFoundException extends AbstractException {
    constructor(
        { actualCount, expectedCount, originalError }: SomeTokensNotFoundExceptionMetadata
    ) {
        super(
            "Some tokens are not found",
            "SOME_TOKENS_NOT_FOUND_EXCEPTION",
            {
                actualCount,
                expectedCount,
                originalError,
            }
        )
    }
}
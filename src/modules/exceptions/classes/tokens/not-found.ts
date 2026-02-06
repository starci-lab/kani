import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    TokenId 
} from "@modules/databases"

/** Metadata when token cannot be found. */
export interface TokenNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: TokenId
    conditions?: unknown
    tokenAddress?: string
}

/** Thrown when token cannot be found. */
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

/** Thrown when one or more tokens cannot be found. */
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
/**
 * Privy Exceptions
 * Errors related to Privy authentication operations
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when Privy auth token is invalid */
export interface InvalidPrivyAuthTokenExceptionMetadata extends AbstractExceptionMetadata {
    token?: string
}

/** Thrown when Privy auth token is invalid. */
export class InvalidPrivyAuthTokenException extends AbstractException {
    constructor(
        {
            token,
            originalError,
        }: InvalidPrivyAuthTokenExceptionMetadata
    ) {
        super(
            "Invalid Privy auth token",
            "INVALID_PRIVY_AUTH_TOKEN_EXCEPTION",
            {
                token,
                originalError,
            }
        )
    }
}

/** Thrown when no Privy auth token is provided in request */
export class NoPrivyAuthTokenProvidedException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            "No Privy auth token provided",
            "NO_PRIVY_AUTH_TOKEN_PROVIDED_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

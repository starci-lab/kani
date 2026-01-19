/**
 * JWT Exceptions
 * Errors related to JWT authentication and token operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when user ID is missing for access token generation */
export interface UserIdRequiredToGenerateAccessTokenExceptionMetadata extends AbstractExceptionMetadata {
    userId?: string
}

export class UserIdRequiredToGenerateAccessTokenException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: UserIdRequiredToGenerateAccessTokenExceptionMetadata = {
        }
    ) {
        super(
            "User ID is required to generate access token",
            "USER_ID_REQUIRED_TO_GENERATE_ACCESS_TOKEN_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

/** Thrown when no authentication token is provided */
export class NoAuthenticationTokenException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            "No authentication token provided",
            "NO_AUTHENTICATION_TOKEN_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when invalid authentication token is provided */
export interface InvalidAuthenticationTokenExceptionMetadata extends AbstractExceptionMetadata {
    token?: string
}

export class InvalidAuthenticationTokenException extends AbstractException {
    constructor(
        {
            token,
            originalError,
        }: InvalidAuthenticationTokenExceptionMetadata = {
        }
    ) {
        super(
            "Invalid authentication token",
            "INVALID_AUTHENTICATION_TOKEN_EXCEPTION",
            {
                token,
                originalError,
            }
        )
    }
}

/** Thrown when user has not completed MFA verification */
export interface UserHasNotCompletedMFAAuthenticationExceptionMetadata extends AbstractExceptionMetadata {
    userId?: string
}

export class UserHasNotCompletedMFAAuthenticationException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: UserHasNotCompletedMFAAuthenticationExceptionMetadata = {
        }
    ) {
        super(
            "User has not completed MFA authentication",
            "USER_HAS_NOT_COMPLETED_MFA_AUTHENTICATION_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

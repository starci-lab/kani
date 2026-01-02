/**
 * Authentication Exceptions
 * Errors related to user authentication and authorization
 */

import { AbstractException } from "../abstract"

/** Thrown when user ID is missing for access token generation */
export class UserIdRequiredToGenerateAccessTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "User ID is required to generate access token", "USER_ID_REQUIRED_TO_GENERATE_ACCESS_TOKEN_EXCEPTION")
    }
}

/** Thrown when Privy auth token is invalid */
export class InvalidPrivyAuthTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid Privy auth token", "INVALID_PRIVY_AUTH_TOKEN_EXCEPTION")
    }
}

/** Thrown when no Privy auth token is provided in request */
export class NoPrivyAuthTokenProvidedException extends AbstractException {
    constructor(message?: string) {
        super(message || "No Privy auth token provided", "NO_PRIVY_AUTH_TOKEN_PROVIDED_EXCEPTION")
    }
}

/** Thrown when user has not completed MFA verification */
export class UserHasNotCompletedMFAAuthenticationException extends AbstractException {
    constructor(message?: string) {
        super(message || "User has not completed MFA authentication", "USER_HAS_NOT_COMPLETED_MFA_AUTHENTICATION_EXCEPTION")
    }
}

/** Thrown when no authentication token is provided */
export class NoAuthenticationTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "No authentication token provided", "NO_AUTHENTICATION_TOKEN_EXCEPTION")
    }
}

/** Thrown when invalid authentication token is provided */
export class InvalidAuthenticationTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid authentication token", "INVALID_AUTHENTICATION_TOKEN_EXCEPTION")
    }
}
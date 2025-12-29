/**
 * User Exceptions
 * Errors related to user operations and sessions
 */

import { AbstractException } from "../abstract"

/** Thrown when user cannot be found */
export class UserNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User not found", "USER_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when user TOTP secret is not found */
export class UserTotpSecretNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User totp secret not found", "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when session cannot be found */
export class SessionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Session not found", "SESSION_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when sign-in OTP is not found */
export class SignInOtpNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Sign in OTP not found", "SIGN_IN_OTP_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when sign-in OTP does not match */
export class SignInOtpMismatchException extends AbstractException {
    constructor(message?: string) {
        super(message || "Sign in OTP mismatch", "SIGN_IN_OTP_MISMATCH_EXCEPTION")
    }
}

/** Thrown when user MFA is already enabled */
export class UserMfaAlreadyEnabledException extends AbstractException {
    constructor(message?: string) {
        super(message || "User MFA already enabled", "USER_MFA_ALREADY_ENABLED_EXCEPTION")
    }
}

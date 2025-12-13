import { AbstractException } from "../abstract"

export class UserNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User not found", "USER_NOT_FOUND_EXCEPTION")
    }
}

export class UserTotpSecretNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User totp secret not found", "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION")
    }
}

export class SessionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Session not found", "SESSION_NOT_FOUND_EXCEPTION")
    }
}

export class SignInOtpNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Sign in OTP not found", "SIGN_IN_OTP_NOT_FOUND_EXCEPTION")
    }
}

export class SignInOtpMismatchException extends AbstractException {
    constructor(message?: string) {
        super(message || "Sign in OTP mismatch", "SIGN_IN_OTP_MISMATCH_EXCEPTION")
    }
}

export class UserMfaAlreadyEnabledException extends AbstractException {
    constructor(message?: string) {
        super(message || "User MFA already enabled", "USER_MFA_ALREADY_ENABLED_EXCEPTION")
    }
}
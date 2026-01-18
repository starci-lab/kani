/**
 * Sign-in OTP Exceptions
 * Errors related to sign-in OTP operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when sign-in OTP is not found */
export interface SignInOtpNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    signInOtpId: string
}

export class SignInOtpNotFoundException extends AbstractException {
    constructor(
        {
            signInOtpId,
            originalError,
        }: SignInOtpNotFoundExceptionMetadata
    ) {
        super(
            "Sign in OTP not found",
            "SIGN_IN_OTP_NOT_FOUND_EXCEPTION",
            {
                signInOtpId,
                originalError,
            }
        )
    }
}

/** Thrown when sign-in OTP does not match */
export interface SignInOtpMismatchExceptionMetadata extends AbstractExceptionMetadata {
    signInOtpId: string
}

export class SignInOtpMismatchException extends AbstractException {
    constructor(
        {
            signInOtpId,
            originalError,
        }: SignInOtpMismatchExceptionMetadata
    ) {
        super(
            "Sign in OTP mismatch",
            "SIGN_IN_OTP_MISMATCH_EXCEPTION",
            {
                signInOtpId,
                originalError,
            }
        )
    }
}

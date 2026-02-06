/**
 * Sign-in OTP Exceptions
 * Errors related to sign-in OTP operations
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when sign-in OTP is not found */
export interface SignInOtpNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    email: string
}

/** Thrown when sign-in OTP is not found. */
export class SignInOtpNotFoundException extends AbstractException {
    constructor(
        {
            email,
            originalError,
        }: SignInOtpNotFoundExceptionMetadata
    ) {
        super(
            "Sign in OTP not found",
            "SIGN_IN_OTP_NOT_FOUND_EXCEPTION",
            {
                email,
                originalError,
            }
        )
    }
}

/** Thrown when sign-in OTP does not match */
export interface SignInOtpMismatchExceptionMetadata extends AbstractExceptionMetadata {
    email: string
}

/** Thrown when sign-in OTP does not match. */
export class SignInOtpMismatchException extends AbstractException {
    constructor(
        {
            email,
            originalError,
        }: SignInOtpMismatchExceptionMetadata
    ) {
        super(
            "Sign in OTP mismatch",
            "SIGN_IN_OTP_MISMATCH_EXCEPTION",
            {
                email,
                originalError,
            }
        )
    }
}

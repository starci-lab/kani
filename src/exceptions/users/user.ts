/**
 * User Exceptions
 * Errors related to user operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when user cannot be found */
export interface UserNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
}

export class UserNotFoundException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: UserNotFoundExceptionMetadata
    ) {
        super(
            "User not found",
            "USER_NOT_FOUND_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

/** Thrown when user TOTP secret is not found */
export interface UserTotpSecretNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
}

export class UserTotpSecretNotFoundException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: UserTotpSecretNotFoundExceptionMetadata
    ) {
        super(
            "User totp secret not found",
            "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

/** Thrown when user MFA is already enabled */
export interface UserMfaAlreadyEnabledExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
}

export class UserMfaAlreadyEnabledException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: UserMfaAlreadyEnabledExceptionMetadata
    ) {
        super(
            "User MFA already enabled",
            "USER_MFA_ALREADY_ENABLED_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

/** Thrown when failed to generate referral code */
export interface FailedToGenerateReferralCodeExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
}

export class FailedToGenerateReferralCodeException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: FailedToGenerateReferralCodeExceptionMetadata
    ) {
        super(
            "Failed to generate referral code",
            "FAILED_TO_GENERATE_REFERRAL_CODE_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}

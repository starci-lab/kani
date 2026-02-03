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
    id?: string
    privyUserId?: string
}

export class UserNotFoundException extends AbstractException {
    constructor(
        {
            id,
            privyUserId,
            originalError,
        }: UserNotFoundExceptionMetadata
    ) {
        super(
            "User not found",
            "USER_NOT_FOUND_EXCEPTION",
            {
                id,
                privyUserId,
                originalError,
            }
        )
    }
}

/** Thrown when user TOTP secret is not found */
export interface UserTotpSecretNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}

export class UserTotpSecretNotFoundException extends AbstractException {
    constructor(
        {
            id,
            originalError,
        }: UserTotpSecretNotFoundExceptionMetadata
    ) {
        super(
            "User totp secret not found",
            "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}

/** Thrown when user MFA is already enabled */
export interface UserMfaAlreadyEnabledExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}

export class UserMfaAlreadyEnabledException extends AbstractException {
    constructor(
        {
            id,
            originalError,
        }: UserMfaAlreadyEnabledExceptionMetadata
    ) {
        super(
            "User MFA already enabled",
            "USER_MFA_ALREADY_ENABLED_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}

/** Thrown when failed to generate referral code */
export interface FailedToGenerateReferralCodeExceptionMetadata extends AbstractExceptionMetadata {
    email: string
}

export class FailedToGenerateReferralCodeException extends AbstractException {
    constructor(
        {
            email,
            originalError,
        }: FailedToGenerateReferralCodeExceptionMetadata
    ) {
        super(
            "Failed to generate referral code",
            "FAILED_TO_GENERATE_REFERRAL_CODE_EXCEPTION",
            {
                email,
                originalError,
            }
        )
    }
}

/** Thrown when email is not found for a user */
export interface EmailNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    privyUserId: string
}

export class EmailNotFoundException extends AbstractException {
    constructor(
        {
            privyUserId,
            originalError,
        }: EmailNotFoundExceptionMetadata
    ) {
        super(
            "Email not found",
            "EMAIL_NOT_FOUND_EXCEPTION",
            {
                privyUserId,
                originalError,
            }
        )
    }
}
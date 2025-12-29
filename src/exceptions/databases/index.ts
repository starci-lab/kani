/**
 * Database Exceptions
 * Errors related to database operations
 */

import { AbstractException } from "../abstract"

/** Thrown when attempting to create a duplicate referral code */
export class ReferralCodeAlreadyExistsException extends AbstractException {
    constructor(message?: string) {
        super(message || "Referral code already exists", "REFERRAL_CODE_ALREADY_EXISTS_EXCEPTION")
    }
}

/** Thrown when user creation fails */
export class CannotCreateUserException extends AbstractException {
    constructor(message?: string) {
        super(message || "Cannot create user", "CANNOT_CREATE_USER_EXCEPTION")
    }
}

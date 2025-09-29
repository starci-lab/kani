import { InternalServerErrorException, NotFoundException } from "@nestjs/common"

// Error when referral code already exists
export class ReferralCodeAlreadyExistsException extends InternalServerErrorException {
    constructor(message?: string) {
        super(message || "Referral code already exists")
        this.name = "REFERRAL_CODE_ALREADY_EXISTS_EXCEPTION"
    }
}

// Error when user is not found
export class CannotCreateUserException extends InternalServerErrorException {
    constructor(message?: string) {
        super(message || "Cannot create user")
        this.name = "CANNOT_CREATE_USER_EXCEPTION"
    }
}

export class UserNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "User not found")
        this.name = "USER_NOT_FOUND_EXCEPTION"
    }
}

export class UserTotpSecretNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "User TOTP secret not found")
        this.name = "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION"
    }
}

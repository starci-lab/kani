import { InternalServerErrorException, NotFoundException } from "@nestjs/common"

// Error when referral code already exists
export class ReferralCodeAlreadyExistsException extends InternalServerErrorException {
    constructor(message?: string) {
        super(message || "Referral code already exists")
    }
}

// Error when user is not found
export class CannotCreateUserException extends InternalServerErrorException {
    constructor(message?: string) {
        super(message || "Cannot create user")
    }
}

export class UserNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "User not found")
    }
}

export class UserTotpSecretNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "User TOTP secret not found")
    }
}

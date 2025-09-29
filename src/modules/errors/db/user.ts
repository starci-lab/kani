import { InternalServerErrorException } from "@nestjs/common"

// Error when referral code already exists
export class ReferralCodeAlreadyExistsException extends InternalServerErrorException {
    constructor(message: string) {
        super(message)
    }
}

import { AbstractException } from "../abstract"

export class ReferralCodeAlreadyExistsException extends AbstractException {
    constructor(message?: string) {
        super(
            message || "Referral code already exists", 
            "REFERRAL_CODE_ALREADY_EXISTS_EXCEPTION"
        )
    }
}
import { AbstractException } from "../abstract"

export class UserHasNotCompletedTOTPVerificationException extends AbstractException {
    constructor(message?: string) {
        super(message || "User has not completed TOTP verification", "USER_HAS_NOT_COMPLETED_TOTP_VERIFICATION_EXCEPTION")
    }
}
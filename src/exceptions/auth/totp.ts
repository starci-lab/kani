import { AbstractException } from "../abstract"

export class UserHasNotCompletedMFAAuthenticationException extends AbstractException {
    constructor(message?: string) {
        super(message || "User has not completed MFA authentication", "USER_HAS_NOT_COMPLETED_MFA_AUTHENTICATION_EXCEPTION")
    }
}
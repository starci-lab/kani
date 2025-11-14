import { AbstractException } from "../abstract"

export class UserNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User not found", "USER_NOT_FOUND_EXCEPTION")
    }
}

export class UserTotpSecretNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "User totp secret not found", "USER_TOTP_SECRET_NOT_FOUND_EXCEPTION")
    }
}

export class SessionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Session not found", "SESSION_NOT_FOUND_EXCEPTION")
    }
}
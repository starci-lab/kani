import { AbstractException } from "../abstract"

export class InvalidPrivyAuthTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid Privy auth token", "INVALID_PRIVY_AUTH_TOKEN_EXCEPTION")
    }
}

export class NoPrivyAuthTokenProvidedException extends AbstractException {
    constructor(message?: string) {
        super(message || "No Privy auth token provided", "NO_PRIVY_AUTH_TOKEN_PROVIDED_EXCEPTION")
    }
}
import { AbstractException } from "@exceptions"

export class TokenNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Token not found", "TOKEN_NOT_FOUND_EXCEPTION")
    }
}

export class PythTokenNotFoundException extends AbstractException {
    constructor(priceFeedId: string, message?: string) {
        super(message || "Pyth token not found", "PYTH_TOKEN_NOT_FOUND_EXCEPTION", { priceFeedId })
    }
}

export class TokenListIsEmptyException extends AbstractException {
    constructor(message?: string) {
        super(message || "Token list is empty", "TOKEN_LIST_IS_EMPTY_EXCEPTION")
    }
}
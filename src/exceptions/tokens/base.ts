import { AbstractException } from "@exceptions"
import { TokenId } from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"

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

export class PythTokenPriceNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Pyth token price not found", "PYTH_TOKEN_PRICE_NOT_FOUND_EXCEPTION", { tokenId })
    }
}

export class TokenListIsEmptyException extends AbstractException {
    constructor(message?: string) {
        super(message || "Token list is empty", "TOKEN_LIST_IS_EMPTY_EXCEPTION")
    }
}

export class InvalidPoolTokensException extends AbstractException {
    constructor(message?: string) {
        super(message || "Either token A or token B is not in the pool", "INVALID_POOL_TOKENS_EXCEPTION")
    }
}

export class InvalidTokenAddressException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token address", "INVALID_TOKEN_ADDRESS_EXCEPTION")
    }
}

export class InvalidTokenChainIdException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token chain id", "INVALID_TOKEN_CHAIN_ID_EXCEPTION")
    }
}

export class InvalidTokenPlatformException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token platform", "INVALID_TOKEN_PLATFORM_EXCEPTION")
    }
}

export class MinRequiredAmountNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Min required amount not found", "MIN_REQUIRED_AMOUNT_NOT_FOUND_EXCEPTION", { tokenId })
    }
}

export class AmountBNotBelowExpectedException extends AbstractException {
    constructor(expected: BN, actual: BN, message?: string) {
        super(message || "Amount B is not below expected", "AMOUNT_B_NOT_BELOW_EXPECTED_EXCEPTION", { expected: expected.toString(), actual: actual.toString() })
    }
}

export class AmountBNotAboveExpectedException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || "Amount B is not above expected", "AMOUNT_B_NOT_ABOVE_EXPECTED_EXCEPTION", { ratio: ratio.toString() })
    }
}

export class AmountBInBetweenExpectedException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || "Amount B is in between expected", "AMOUNT_B_IN_BETWEEN_EXPECTED_EXCEPTION", { ratio: ratio.toString() })
    }
}
/**
 * Token Exceptions
 * Errors related to token operations and validation
 */

import { AbstractException } from "../abstract"
import { TokenId } from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"

/** Thrown when token cannot be found */
export class TokenNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Token not found", "TOKEN_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when Pyth token cannot be found by price feed ID */
export class PythTokenNotFoundException extends AbstractException {
    constructor(priceFeedId: string, message?: string) {
        super(message || "Pyth token not found", "PYTH_TOKEN_NOT_FOUND_EXCEPTION", { priceFeedId })
    }
}

/** Thrown when Pyth token price is not available */
export class PythTokenPriceNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Pyth token price not found", "PYTH_TOKEN_PRICE_NOT_FOUND_EXCEPTION", { tokenId })
    }
}

/** Thrown when liquidity pool ID is required for spot price calculation */
export class LiquidityPoolIdRequiredForSpotPriceException extends AbstractException {
    constructor(message?: string) {
        super(message || "Liquidity pool ID is required for spot price", "LIQUIDITY_POOL_ID_REQUIRED_FOR_SPOT_PRICE_EXCEPTION")
    }
}

/** Thrown when token list is empty */
export class TokenListIsEmptyException extends AbstractException {
    constructor(message?: string) {
        super(message || "Token list is empty", "TOKEN_LIST_IS_EMPTY_EXCEPTION")
    }
}

/** Thrown when pool tokens are invalid */
export class InvalidPoolTokensException extends AbstractException {
    constructor(message?: string) {
        super(message || "Either token A or token B is not in the pool", "INVALID_POOL_TOKENS_EXCEPTION")
    }
}

/** Thrown when token address is invalid */
export class InvalidTokenAddressException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token address", "INVALID_TOKEN_ADDRESS_EXCEPTION")
    }
}

/** Thrown when token chain ID is invalid */
export class InvalidTokenChainIdException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token chain id", "INVALID_TOKEN_CHAIN_ID_EXCEPTION")
    }
}

/** Thrown when token platform is invalid */
export class InvalidTokenPlatformException extends AbstractException {
    constructor(message?: string) {
        super(message || "Invalid token platform", "INVALID_TOKEN_PLATFORM_EXCEPTION")
    }
}

/** Thrown when minimum required amount is not found for token */
export class MinRequiredAmountNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Min required amount not found", "MIN_REQUIRED_AMOUNT_NOT_FOUND_EXCEPTION", { tokenId })
    }
}

/** Thrown when amount B is not below expected threshold */
export class AmountBNotBelowExpectedException extends AbstractException {
    constructor(expected: BN, actual: BN, message?: string) {
        super(message || "Amount B is not below expected", "AMOUNT_B_NOT_BELOW_EXPECTED_EXCEPTION", { expected: expected.toString(), actual: actual.toString() })
    }
}

/** Thrown when amount B is not above expected threshold */
export class AmountBNotAboveExpectedException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || "Amount B is not above expected", "AMOUNT_B_NOT_ABOVE_EXPECTED_EXCEPTION", { ratio: ratio.toString() })
    }
}

/** Thrown when amount B is unexpectedly in between thresholds */
export class AmountBInBetweenExpectedException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || "Amount B is in between expected", "AMOUNT_B_IN_BETWEEN_EXPECTED_EXCEPTION", { ratio: ratio.toString() })
    }
}

/** Thrown when both Pyth and spot price are not found */
export class PythAndSpotPriceNotFoundException extends AbstractException {
    constructor(tokenA: TokenId, tokenB: TokenId, message?: string) {
        super(message || "Pyth and spot price not found for the given tokens", "PYTH_AND_SPOT_PRICE_NOT_FOUND_EXCEPTION", { tokenA, tokenB })
    }
}

/** Thrown when transaction validation fails */
export class TransactionValidationFailedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction validation failed", "TRANSACTION_VALIDATION_FAILED_EXCEPTION")
    }
}

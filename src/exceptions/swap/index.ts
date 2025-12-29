/**
 * Swap Exceptions
 * Errors related to token swap operations
 */

import { AbstractException } from "../abstract"
import { Decimal } from "decimal.js"

/** Thrown when swap amounts deviation is not acceptable */
export class SwapExpectedAndQuotedAmountsNotAcceptableException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || `Swap expected and quoted amounts are not acceptable: ${ratio.toString()}`, "SWAP_EXPECTED_AND_QUOTED_AMOUNTS_NOT_ACCEPTABLE_EXCEPTION", { ratio: ratio.toString() })
    }
}

/** Thrown when estimated swapped quote amount is not found */
export class EstimatedSwappedQuoteAmountNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Estimated swapped quote amount not found", "ESTIMATED_SWAPPED_QUOTE_AMOUNT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when estimated swapped target amount is not found */
export class EstimatedSwappedTargetAmountNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Estimated swapped target amount not found", "ESTIMATED_SWAPPED_TARGET_AMOUNT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when estimated swapped amount is not found */
export class EstimatedSwappedAmountNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Estimated swapped amount not found", "ESTIMATED_SWAPPED_AMOUNT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when zap amount deviation is not acceptable */
export class ZapAmountNotAcceptableException extends AbstractException {
    constructor(deviation: Decimal, message?: string) {
        super(message || `Zap amount is not acceptable: ${deviation.toString()}`, "ZAP_AMOUNT_NOT_ACCEPTABLE_EXCEPTION", { deviation: deviation.toString() })
    }
}

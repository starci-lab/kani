import { Decimal } from "turbos-clmm-sdk"
import { AbstractException } from "../abstract"

export class SwapExpectedAndQuotedAmountsNotAcceptableException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(
            message || `Swap expected and quoted amounts are not acceptable: ${ratio.toString()}`, 
            "SWAP_EXPECTED_AND_QUOTED_AMOUNTS_NOT_ACCEPTABLE_EXCEPTION", 
            { ratio: ratio.toString() }
        )
    }
}


export class EstimatedSwappedQuoteAmountNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Estimated swapped quote amount not found", "ESTIMATED_SWAPPED_QUOTE_AMOUNT_NOT_FOUND_EXCEPTION")
    }
}

export class EstimatedSwappedTargetAmountNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Estimated swapped target amount not found", "ESTIMATED_SWAPPED_TARGET_AMOUNT_NOT_FOUND_EXCEPTION")
    }
}
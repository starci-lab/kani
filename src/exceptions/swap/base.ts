import { Decimal } from "turbos-clmm-sdk"
import { AbstractException } from "../abstract"

export class SwapExpectedAndQuotedAmountsNotAcceptableException extends AbstractException {
    constructor(deviation: Decimal, message?: string) {
        super(
            message || `Swap expected and quoted amounts are not acceptable: ${deviation.toString()}`, 
            "SWAP_EXPECTED_AND_QUOTED_AMOUNTS_NOT_ACCEPTABLE_EXCEPTION", 
            { deviation: deviation.toString() }
        )
    }
}
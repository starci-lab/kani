import BN from "bn.js"
import {
    Decimal
} from "decimal.js"

/** Parameters for ensure calculation. */
export interface EnsureCalculationParams {
    expected: BN
    actual: BN
    // Optional custom thresholds
    lowerBound?: Decimal  // for ensureActualNotBelowExpected
    upperBound?: Decimal  // for ensureActualNotAboveExpected
}

/** Result of ensure calculation. */
export interface EnsureCalculationResult {
    ratio: Decimal
    isAcceptable: boolean
}

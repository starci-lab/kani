import BN from "bn.js"
import Decimal from "decimal.js"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when value is not in between expected */
export enum EnsureRangeType {
    LowerBound = "lowerBound",
    UpperBound = "upperBound",
    Between = "between",
}
export interface EnsureCalculationExceptionMetadata extends AbstractExceptionMetadata {
    expected: BN
    actual: BN
    lowerBound?: Decimal
    upperBound?: Decimal
    rangeType: EnsureRangeType
}

export class EnsureCalculationException extends AbstractException {
    constructor(
        { expected, actual, lowerBound, upperBound, rangeType, originalError }: EnsureCalculationExceptionMetadata
    ) {
        super(
            "Ensure calculation exception", 
            "ENSURE_CALCULATION_EXCEPTION", 
            {
                expected: expected.toString(),
                actual: actual.toString(),
                lowerBound: lowerBound?.toString(),
                upperBound: upperBound?.toString(),
                rangeType,
                originalError,
            }
        )
    }
}
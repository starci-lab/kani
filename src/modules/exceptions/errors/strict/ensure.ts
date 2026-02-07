import BN from "bn.js"
import Decimal from "decimal.js"
import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    EnsureRangeType 
} from "../../enums"

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
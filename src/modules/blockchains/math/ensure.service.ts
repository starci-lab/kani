import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"

export interface EnsureCalculationParams {
    expected: BN
    actual: BN

    // Optional custom thresholds
    lowerBound?: Decimal  // for ensureActualNotBelowExpected
    upperBound?: Decimal  // for ensureActualNotAboveExpected
}

export interface EnsureCalculationResponse {
    ratio: Decimal
    isAcceptable: boolean
}

const LOWER_BOUND_DEFAULT = new Decimal(0.95)  // 95%
const UPPER_BOUND_DEFAULT = new Decimal(1.05)  // 105%

@Injectable()
export class EnsureMathService {

    private computeRatio(expected: BN, actual: BN): Decimal {
        return new Decimal(actual.toString()).div(new Decimal(expected.toString()))
    }

    /**
     * actual should be >= lowerBound * expected
     * default lowerBound = 95%
     */
    public ensureActualNotBelowExpected(
        { expected, actual, lowerBound }: EnsureCalculationParams
    ): EnsureCalculationResponse {
        const ratio = this.computeRatio(expected, actual)
        const bound = lowerBound ?? LOWER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.gte(bound),
        }
    }

    /**
     * actual should be <= upperBound * expected
     * default upperBound = 105%
     */
    public ensureActualNotAboveExpected(
        { expected, actual, upperBound }: EnsureCalculationParams
    ): EnsureCalculationResponse {
        const ratio = this.computeRatio(expected, actual)
        const bound = upperBound ?? UPPER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.lte(bound),
        }
    }

    /**
     * lowerBound <= actual/expected <= upperBound
     */
    public ensureBetween(
        { expected, actual, lowerBound, upperBound }: EnsureCalculationParams
    ): EnsureCalculationResponse {
        const ratio = this.computeRatio(expected, actual)

        const lower = lowerBound ?? LOWER_BOUND_DEFAULT
        const upper = upperBound ?? UPPER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.gte(lower) && ratio.lte(upper),
        }
    }
    
}
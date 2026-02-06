import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    EnsureCalculationParams,
    EnsureCalculationResult
} from "./types"

/** Default lower bound threshold (95%). */
const LOWER_BOUND_DEFAULT = new Decimal(0.95)

/** Default upper bound threshold (105%). */
const UPPER_BOUND_DEFAULT = new Decimal(1.05)

/**
 * Service responsible for validation calculations.
 * Ensures actual values meet expected thresholds with configurable bounds.
 *
 * @example
 * const service = new EnsureMathService()
 * const result = service.ensureActualNotBelowExpected({ expected, actual })
 */
@Injectable()
export class EnsureMathService {
    /**
     * Computes the ratio of actual to expected value.
     *
     * @param expected - Expected value
     * @param actual - Actual value
     * @returns Ratio as decimal
     */
    private computeRatio(expected: BN, actual: BN): Decimal {
        return new Decimal(actual.toString()).div(new Decimal(expected.toString()))
    }

    /**
     * Ensures actual value is not below expected value.
     * Validates that actual >= lowerBound * expected (default 95%).
     *
     * @param param - Parameters for validation
     * @param param.expected - Expected value
     * @param param.actual - Actual value
     * @param param.lowerBound - Optional lower bound threshold (default 0.95)
     * @returns Validation result with ratio and acceptability
     *
     * @example
     * const result = service.ensureActualNotBelowExpected({ expected, actual })
     */
    public ensureActualNotBelowExpected({
        expected,
        actual,
        lowerBound
    }: EnsureCalculationParams): EnsureCalculationResult {
        // compute ratio of actual to expected
        const ratio = this.computeRatio(expected,
            actual)
        
        // use provided bound or default
        const bound = lowerBound ?? LOWER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.gte(bound),
        }
    }
    
    /**
     * Ensures actual value is not above expected value.
     * Validates that actual <= upperBound * expected (default 105%).
     *
     * @param param - Parameters for validation
     * @param param.expected - Expected value
     * @param param.actual - Actual value
     * @param param.upperBound - Optional upper bound threshold (default 1.05)
     * @returns Validation result with ratio and acceptability
     *
     * @example
     * const result = service.ensureActualNotAboveExpected({ expected, actual })
     */
    public ensureActualNotAboveExpected({
        expected,
        actual,
        upperBound
    }: EnsureCalculationParams): EnsureCalculationResult {
        // compute ratio of actual to expected
        const ratio = this.computeRatio(expected,
            actual)
        
        // use provided bound or default
        const bound = upperBound ?? UPPER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.lte(bound),
        }
    }

    /**
     * Ensures actual value is between lower and upper bounds of expected value.
     * Validates that lowerBound <= actual/expected <= upperBound.
     *
     * @param param - Parameters for validation
     * @param param.expected - Expected value
     * @param param.actual - Actual value
     * @param param.lowerBound - Optional lower bound threshold (default 0.95)
     * @param param.upperBound - Optional upper bound threshold (default 1.05)
     * @returns Validation result with ratio and acceptability
     *
     * @example
     * const result = service.ensureBetween({ expected, actual })
     */
    public ensureBetween({
        expected,
        actual,
        lowerBound,
        upperBound
    }: EnsureCalculationParams): EnsureCalculationResult {
        // compute ratio of actual to expected
        const ratio = this.computeRatio(expected,
            actual)

        // use provided bounds or defaults
        const lower = lowerBound ?? LOWER_BOUND_DEFAULT
        const upper = upperBound ?? UPPER_BOUND_DEFAULT

        return {
            ratio,
            isAcceptable: ratio.gte(lower) && ratio.lte(upper),
        }
    }
}
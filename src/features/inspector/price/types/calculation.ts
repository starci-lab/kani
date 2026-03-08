import {
<<<<<<< HEAD
    MarketListingId,
=======
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a
    PricePoint
} from "@modules/databases"

/**
 * Parameters for computing TWAP.
 */
export interface AnalyzePriceWindowParams {
    /** Price points. */
    pricePoints: Array<PricePoint>
}

/**
 * Peak -> now metrics.
 */
export interface PeakToNowMetrics {
    peakPrice: number
    peakIndex: number
    barsSincePeak: number
    dropFromPeakPct: number
    slopeFromPeakPctPerBar: number
    velFromPeakPctPerMin: number
    peakTime: number
}

/**
 * Trough -> now metrics.
 */
export interface TroughToNowMetrics {
    troughPrice: number
    troughIndex: number
    barsSinceTrough: number
    riseFromTroughPct: number
    slopeFromTroughPctPerBar: number
    velFromTroughPctPerMin: number
    troughTime: number
<<<<<<< HEAD
}

/**
 * Momentum state configuration.
 */
export interface ClassifyMomentumStateParams {
    /** The slope of the trend. */
    slope: number
    /** The R^2 value of the trend. */
    r2: number
    /** The efficiency ratio of the trend. */
    efficiencyRatio: number
}

/**
 * Parameters for calculating percentage change.
 */
export interface CalculatePctChangeParams {
    /** The price points. */
    pricePoints: Array<PricePoint>
    /** The threshold to calculate the percentage change. */
    threshold: number
}

/**
 * Result of percentage change calculation.
 */
export interface CalculateResult {
    /** Whether to exit the position. */
    shouldExit: boolean
}
/**
 * Parameters for calculating regression slope.
 */
export interface CalculateRegressionSlopeParams {
    /** The price points. */
    pricePoints: Array<PricePoint>
    /** The threshold to calculate the regression slope. */
    threshold: number
}

/**
 * Result of regression slope calculation.
 */
export type CalculateRegressionSlopeResult = number
=======
}
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a

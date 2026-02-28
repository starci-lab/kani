import {
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
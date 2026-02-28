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
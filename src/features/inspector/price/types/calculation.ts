import {
    MarketListingId
} from "@modules/databases"

/**
 * Parameters for computing TWAP.
 */
export interface AnalyzePriceWindowParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: MarketListingId
}

/**
 * Shape of the TWAP.
 */
export enum PriceWindowShape {
    Straight = "straight",
    TrendNoisy = "trend_noisy",
    Choppy = "choppy",
}

/**
 * TWAP result.
 */
export interface PriceWindowResult {
    /**
     * Simple TWAP (mean of samples)
     */
    twap: number
    /**
     * Raw price stats
     */
    maxPrice: number
    minPrice: number
    diffPrice: number
    /**
     * Percentage metrics (%)
     */
    rangePct: number            // (max - min) / min * 100
    fromLowToLastPct: number    // (last - min) / min * 100
    fromHighToLastPct: number   // (last - max) / max * 100 (usually negative)
    drawdownPct: number         // max drawdown in window (%)
    /**
     * Trend / structure
     */
    slope: number               // linear regression slope
    r2: number                  // straightness (0–1)
    efficiencyRatio: number     // directional efficiency (0–1)
    volatility: number          // std dev of returns
    /**
     * Shape classification
     */
    shape: PriceWindowShape
    /**
     * Meta info
     */
    firstPrice: number
    lastPrice: number
    sampleCount: number
    startTime: number
    endTime: number

    /**
     * Peak -> now metrics
     */
    peakPrice: number
    peakIndex: number
    barsSincePeak: number
    dropFromPeakPct: number
    slopeFromPeakPctPerBar: number
    velFromPeakPctPerMin: number
    peakTime: number

    /**
     * Trough -> now metrics
     */
    troughPrice: number
    troughIndex: number
    barsSinceTrough: number
    riseFromTroughPct: number
    slopeFromTroughPctPerBar: number
    velFromTroughPctPerMin: number
    troughTime: number
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
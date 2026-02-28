import {
    MarketListingId 
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"

/**
 * Write InfluxDB price bucket.
 */
export interface WriteInfluxdbPriceBucketParams {
    /** The token ID. */
    id: string
    /** The price. */
    price: Decimal
    /** Market listing ID. */
    marketListingId: MarketListingId
}

/**
 * Query InfluxDB price bucket.
 */
export interface QueryInfluxdbPriceBucketAsyncIteratorParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: MarketListingId
}

/**
 * Query InfluxDB price bucket.
 */
export type QueryInfluxdbPriceBucketPromiseParams = QueryInfluxdbPriceBucketAsyncIteratorParams

/**
 * Price point.
 */
export interface PricePoint {
    id: string
    market_listing_id: MarketListingId
    price: number
    time: number
}

/**
 * Params for writing price window result.
 */
export interface WritePriceWindowResultParams {
    /** The token ID. */
    id: string
    /** Market listing ID. */
    marketListingId: MarketListingId
    /** The price window result. */
    priceWindowResult: PriceWindowResult
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
 * Trend check result.
 */
export enum MomentumState {
    Up = "up",
    Down = "down",
    Sideways = "sideways",
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
    momentumState: MomentumState
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
 * Params for writing momentum state.
 */
export interface WriteMomentumStateParams {
    /** The token ID. */
    id: string
    /** Market listing ID. */
    marketListingId: MarketListingId
    /** The momentum state. */
    momentumState: MomentumState
}
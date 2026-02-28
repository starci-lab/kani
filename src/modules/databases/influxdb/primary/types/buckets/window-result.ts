import type {
    MomentumState,
    PriceWindowShape,
} from "./price"

/** Price window result point from InfluxDB. */
export interface PriceWindowResultPoint {
    id: string
    market_listing_id: string
    momentum_state: MomentumState
    shape: PriceWindowShape
    twap: number
    max_price: number
    min_price: number
    diff_price: number
    range_pct: number
    from_low_to_last_pct: number
    from_high_to_last_pct: number
    drawdown_pct: number
    slope: number
    r2: number
    efficiency_ratio: number
    volatility: number
    first_price: number
    last_price: number
    sample_count: number
    peak_price: number
    peak_index: number
    bars_since_peak: number
    drop_from_peak_pct: number
    slope_from_peak_pct_per_bar: number
    vel_from_peak_pct_per_min: number
    trough_price: number
    trough_index: number
    bars_since_trough: number
    rise_from_trough_pct: number
    slope_from_trough_pct_per_bar: number
    vel_from_trough_pct_per_min: number
    time: number
}

/** Params for querying price window result async iterator. */
export interface QueryInfluxdbWindowResultBucketAsyncIteratorParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: string
}

/** Params for querying price window result promise. */
export type QueryInfluxdbWindowResultBucketPromiseParams = QueryInfluxdbWindowResultBucketAsyncIteratorParams

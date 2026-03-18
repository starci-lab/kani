import {
    IndicatorRecord,
    IndicatorStatus,
} from "@modules/cache"

export {
    IndicatorStatus,
}

/**
 * The metadata of the price pct indicator.
 */
export interface PricePctIndicatorMetadata {
    /**
     * The percentage change.
     */
    pct: number
}

export interface IndicatorResult<T> {
    /**
     * The id of the indicator.
     */
    id: string
    /**
     * The status of the indicator.
     */
    status: IndicatorStatus
    /**
     * The time window in milliseconds.
     */
    timeWindowMs: number
    /**
     * The metadata of the indicator.
     */
    metadata: T
    /**
     * The records of the indicator.
     */
    records: Array<IndicatorRecord>
}

/**
 * The result of the price pct indicator.
 */
export type PricePctIndicatorResult = IndicatorResult<PricePctIndicatorMetadata>

/**
 * The metadata of the price regression indicator.
 */
export interface PriceRegressionIndicatorMetadata {
    pct: number
    r2: number
}

/**
 * The result of the price regression indicator.
 */
export type PriceRegressionIndicatorResult = IndicatorResult<PriceRegressionIndicatorMetadata>
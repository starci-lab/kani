/**
 * The status of the indicator.
 */
export enum IndicatorStatus {
    /**
     * The indicator has triggered.
     */
    Trigger = "trigger",
    /**
     * The indicator has reentered.
     */
    Reentry = "reentry",
    /**
     * The indicator has no action.
     */
    NoAction = "noAction",
    /**
     * The indicator has emergency exited.
     */
    EmergencyExit = "emergencyExit",
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
}

/**
 * The result of the price pct indicator.
 */
export interface PricePctIndicatorResult extends IndicatorResult<PricePctIndicatorMetadata> {
}

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
export interface PriceRegressionIndicatorResult extends IndicatorResult<PriceRegressionIndicatorMetadata> {
}
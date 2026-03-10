/**
 * Metadata for price percentage violate indicator.
 */
export interface PricePctViolateIndicatorMetadata {
    /**
     * The time window in milliseconds.
     */
    timeWindowMs: number
}

/**
 * Metadata for price regression violate indicator.
 */
export interface PriceRegressionViolateIndicatorMetadata {
    /**
     * The time window in milliseconds.
     */
    timeWindowMs: number
    /**
     * The R2 threshold.
     */
    r2Threshold: number
}

/**
 * Metadata for volume spike violate indicator.
 */
export interface VolumeSpikeViolateIndicatorMetadata {
    /**
     * The time window in milliseconds.
     */
    timeWindowMs: number
    /**
     * The volume threshold.
     */
    volumeThreshold: number
}
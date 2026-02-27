/**
 * InfluxDB bootstrapped successfully message.
 */
export interface InfluxDBBootstrappedSuccessfullyMessage {
    /** The database name. */
    database: string
}

/**
 * InfluxDB bootstrapped failed message.
 */
export interface InfluxDBBootstrappedFailedMessage {
    /** The error message. */
    error: string
    /** The database name. */
    database: string
}
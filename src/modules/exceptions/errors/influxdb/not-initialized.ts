import type {
    AbstractExceptionMetadata,
} from "../abstract"
import {
    AbstractException,
} from "../abstract"

/** Thrown when InfluxDB is not yet initialized (e.g. bootstrap not completed). */
export interface InfluxDBNotInitializedExceptionMetadata extends AbstractExceptionMetadata {
    database: string
}

export class InfluxDBNotInitializedException extends AbstractException {
    constructor(
        { database, originalError }: InfluxDBNotInitializedExceptionMetadata
    ) {
        super(
            "InfluxDB not initialized",
            "INFLUXDB_NOT_INITIALIZED_EXCEPTION",
            {
                database,
                originalError,
            }
        )
    }
}

import type {
    MetricName,
} from "../enums"

/** Payload for MetricInitialized log. */
export interface MetricInitializedMessage {
    executorId: string
    metricName: MetricName
}

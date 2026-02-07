import type {
    MetricName 
} from "@modules/prometheus"

export interface MetricInitializedMessage {
    metricName: MetricName
    executorId: string
}
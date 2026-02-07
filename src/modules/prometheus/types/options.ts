import type {
    MetricName,
} from "../enums"

/** Options for Prometheus module registration. */
export interface PrometheusOptions {
    /** Metric names to enable. */
    metricNames: Array<MetricName>
}

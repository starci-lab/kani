/** Prometheus jobs config (metrics path). */
export interface PrometheusJobsConfig {
    metrics: {
        path: string
    }
}

/** REST API config for Prometheus (jobs, metrics). */
export interface PrometheusRestConfig {
    jobs: () => PrometheusJobsConfig
}

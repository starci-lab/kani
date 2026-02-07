/** Prometheus log event names (maps to WinstonLog for winston config). */
export enum MetricLog {
    /** Metric gauge initialized. */
    MetricInitialized = "Prometheus.Metric.Initialized",
}

/** Prometheus metric names. */
export enum MetricName {
    /** Prefix for all kani bot metrics. */
    Prefix = "kanibot_",
    /** HTTP request duration histogram. */
    HttpRequestSeconds = "kanibot_http_request_seconds",
    /** Successful swap transactions counter. */
    SwapSuccessTotal = "kanibot_swap_success_total",
    /** Open position success counter. */
    OpenPositionSuccessTotal = "kanibot_open_position_success_total",
    /** Close position success counter. */
    ClosePositionSuccessTotal = "kanibot_close_position_success_total",
    /** Current bot count gauge. */
    BotCount = "kanibot_bot_count",
}

import {
    prometheusRestConfig,
} from "../config/prometheus"

/** Build Prometheus metrics path from config. */
export const buildPrometheusMetricsPath = () =>
    prometheusRestConfig().jobs().tags

/** Build full Prometheus metrics URL (base + /api/ + path). */
export const buildPrometheusMetricsUrl = (baseUrl: string) =>
    `${baseUrl.replace(/\/$/,
        "")}/api/${buildPrometheusMetricsPath()}`

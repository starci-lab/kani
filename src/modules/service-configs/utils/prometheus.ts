import {
    envConfig, runInKubernetes 
} from "@modules/env"
import {
    prometheusRestConfig,
} from "../config/prometheus"

/** Build Prometheus metrics path from config. */
export const buildPrometheusMetricsPath = () =>
    prometheusRestConfig().jobs().tags

/** Build full Prometheus metrics URL (base + /api/ + path). */
export const buildPrometheusMetricsUrl = () => {
    const path = `api/${buildPrometheusMetricsPath()}`
    if (runInKubernetes()) {
        return `http://${envConfig().k8s.global.podId}:${envConfig().ports.global}${path}`
    }
    return `http://localhost:${envConfig().ports.global}${path}`
}

/** Consul health check entry. */
export interface ConsulHealthCheck {
    Node?: unknown
    Service?: unknown
    Checks?: Array<unknown>
}

/** Params for healthService. */
export interface HealthServiceParams {
    service: string
    dc?: string
}

/** Result of healthService; array of healthy service entries. */
export type HealthServiceResult = Array<ConsulHealthCheck>

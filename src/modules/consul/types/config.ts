import type {
    ServiceName,
} from "@modules/common"

/**
 * Effective config for ConsulService (from env + module options).
 *
 * @typedef {Object} ConsulServiceConfig
 * @property {string} host - Consul HTTP API base URL (from CONSUL_HOST)
 * @property {ServiceName} serviceName - Service name for registration
 */
export type ConsulServiceConfig = {
    host: string
    serviceName: ServiceName
}

import type {
    ServiceName,
} from "@modules/common"

/**
 * Options for Consul module registration.
 */
export interface ConsulOptions {
    /** Service name to register with Consul. */
    serviceName: ServiceName
    /** Enable Prometheus DNS discovery: register executor service on init, deregister on shutdown. */
    enablePrometheusDnsDiscovery?: boolean
    /** Port to register with Consul. */
    port?: number
    /** Address to register with Consul. */
    address?: string
    /** Tags to register with Consul. */
    tags?: Array<string>
    /** Metadata to register with Consul. */
    metas?: Record<string, string>
}
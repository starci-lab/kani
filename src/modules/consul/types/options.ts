import type {
    ServiceName,
} from "@modules/common"

/** Executor DNS discovery config (register service with Consul agent). */
export interface ConsulExecutorDnsOptions {
    /** ID to register with Consul. */
    id: string
}

/**
 * Options for Consul module registration.
 */
export interface ConsulOptions {
    /** Service name to register with Consul. */
    serviceName: ServiceName
    /** Executor ID to register with Consul. */
    id: string
    /** Enable Prometheus DNS discovery: register executor service on init, deregister on shutdown. */
    enablePrometheusDnsDiscovery?: boolean
    /** Port to register with Consul. */
    port?: number
    /** Address to register with Consul. */
    address?: string
}
import type {
    ServiceName,
} from "@modules/common"

/** Consul service config. */
export interface ConsulConfig {
    /** Consul HTTP API base URL. */
    host: string
    /** Service name for registration. */
    serviceName: ServiceName
}

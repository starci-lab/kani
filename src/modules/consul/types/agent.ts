/** Params for agentServiceRegister. */
export interface AgentServiceRegisterParams {
    /** HTTP endpoint. */
    http?: string
    /** Interval (e.g. "10s"). */
    interval?: string
    /** Service tags. */
    tags?: Array<string>
    /** Service metadata. */
    metas?: Record<string, string>
    /** Service ID to register with Consul. */
    id: string
    /** Port to register with Consul. */
    port: number
    /** Address to register with Consul. */
    address?: string
}

/** Result of agentServiceRegister. */
export type AgentServiceRegisterResult = void

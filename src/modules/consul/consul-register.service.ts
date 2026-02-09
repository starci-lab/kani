import {
    Inject,
    Injectable,
} from "@nestjs/common"
import {
    AxiosInstance,
} from "axios"
import {
    AxiosService,
} from "@modules/axios"
import type {
    AgentServiceRegisterParams,
    AgentServiceRegisterResult,
    ConsulConfig,
    ConsulOptions,
    HealthServiceParams,
    HealthServiceResult,
    StatusLeaderResult,
} from "./types"
import {
    envConfig,
} from "@modules/env"
import {
    MODULE_OPTIONS_TOKEN,
} from "./consul.module-definition"

/**
 * Low-level Consul HTTP API client (agent, health, status).
 *
 * @example
 * const leader = await consulRegisterService.statusLeader()
 * await consulRegisterService.agentServiceRegister({ id: "1", port: 3003 })
 */
@Injectable()
export class ConsulRegisterService {
    readonly axios: AxiosInstance
    /** Consul config for service registration. */
    private readonly config: ConsulConfig

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
            options: ConsulOptions,
        private readonly axiosService: AxiosService,
    ) {
        this.config = {
            host: envConfig().consul.host,
            serviceName: options.serviceName,
        }

        this.axios = this.axiosService.create({
            key: "consul",
            config: {
                baseURL: `${this.config.host}/v1`,
            },
        })
    }

    /**
     * Register a service with the local Consul agent (for DNS discovery).
     *
     * @param param - id, port, optional address, optional http, optional interval, optional tags, optional metas
     * @returns void on success
     */
    async agentServiceRegister({
        id,
        port,
        address,
        http,
        interval = envConfig().prometheus.metrics.interval,
        tags,
        metas,
    }: AgentServiceRegisterParams): Promise<AgentServiceRegisterResult> {
        const payload: Record<string, unknown> = {
            Name: this.config.serviceName,
            ID: id,
            Port: port,
        }
        if (address) payload.Address = address
        if (http) {
            payload.Check = {
                HTTP: http,
                Interval: interval 
            }
        }
        if (tags?.length) payload.Tags = tags
        if (metas && Object.keys(metas).length > 0) {
            payload.Meta = metas
        }
        await this.axios.put(
            "/agent/service/register",
            payload
        )
    }

    /**
     * Deregister a service from the local Consul agent.
     *
     * @param id - Executor ID to deregister
     */
    async agentServiceDeregister(id: string): Promise<void> {
        await this.axios.put(
            `/agent/service/deregister/${encodeURIComponent(id)}`,
        )
    }

    /**
     * Get Raft leader status.
     *
     * @returns Leader address
     */
    async statusLeader(): Promise<StatusLeaderResult> {
        const { data } = await this.axios.get<string>("/status/leader")
        return data
    }

    /**
     * Get healthy instances of a service.
     *
     * @param param - Service name and optional datacenter
     * @returns Array of healthy service entries
     */
    async healthService({
        service,
        dc,
    }: HealthServiceParams): Promise<HealthServiceResult> {
        const { data } = await this.axios.get<HealthServiceResult>(
            `/health/service/${encodeURIComponent(service)}`,
            {
                params: dc ? {
                    dc 
                } : {
                },
            },
        )
        return data
    }
}

import {
    Injectable,
    OnApplicationShutdown,
    OnModuleInit,
} from "@nestjs/common"
import {
    Inject,
} from "@nestjs/common"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE
} from "./consul.module-definition"
import {
    ConsulRegisterService,
} from "./consul-register.service"
import {
    envConfig,
} from "@modules/env"
import {
    buildPrometheusMetricsUrl 
} from "@modules/service-configs"

/**
 * Registers the executor with Consul for DNS-based service discovery.
 * On init: registers service. On shutdown: deregisters.
 * Provided only when enablePrometheusDnsDiscovery is set.
 *
 * @example
 * kani-executor.service.consul → resolves to executor instances
 */
@Injectable()
export class RegisterPrometheusDnsService implements OnModuleInit, OnApplicationShutdown {
    constructor(
        private readonly consulRegisterService: ConsulRegisterService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {
    }
    /**
     * Register the executor service with Consul.
     */
    async onModuleInit(): Promise<void> {
        // if enablePrometheusDnsDiscovery is false, return
        if (!this.options.enablePrometheusDnsDiscovery) {
            return
        }
        // register service
        await this.consulRegisterService.agentServiceRegister(
            {
            // ID is the executor ID
                id: this.options.id,
                // port is the port to register with Consul
                port: this.options.port ?? 3000,
                // address is the address to register with Consul, left empty to use agent node address, which is better for Kubernetes
                address: this.options.address,
                // http is the HTTP endpoint to register with Consul, which we use to scrape Prometheus metrics
                http: buildPrometheusMetricsUrl(envConfig().consul.serviceUrl),
                interval: envConfig().prometheus.metrics.interval,
                tags: [
                    `executor-id=${this.options.id}`,
                ],
                metas: {
                    executorId: this.options.id,
                },
            }
        )
    }
    /**
     * Deregister the executor service from Consul.
     */
    async onApplicationShutdown(): Promise<void> {
        await this.consulRegisterService.agentServiceDeregister(this.options.id)
    }
}

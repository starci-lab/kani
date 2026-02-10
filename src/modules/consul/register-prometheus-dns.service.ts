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
import {
    Interval 
} from "@nestjs/schedule"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"

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
        private readonly winstonService: WinstonService,
    ) {
    }

    /**
     * On module init.
     */
    async onModuleInit(): Promise<void> {
        await this.registerDns()
    }

    /**
     * Register the executor service with Consul every 10 seconds.
     */
    @Interval(envConfig().consul.register.interval)
    async registerDnsCron(): Promise<void> {
        await this.registerDns()
    }
    /**
     * Register the executor service with Consul every 10 seconds.
     */
    async registerDns(): Promise<void> {
        if (!this.options.enablePrometheusDnsDiscovery) {
            return
        }
        try {
        // register service
            await this.consulRegisterService.agentServiceRegister(
                {
                    // ID is the executor ID
                    id: envConfig().k8s.global.podName,
                    // port is the port to register with Consul
                    port: this.options.port ?? 3000,
                    // address is the address to register with Consul
                    address: envConfig().k8s.global.podIp,
                    // http is the HTTP endpoint to register with Consul, which we use to scrape Prometheus metrics
                    http: buildPrometheusMetricsUrl(),
                    interval: envConfig().prometheus.metrics.interval,
                    tags: [
                        `service-name=${this.options.serviceName}`,
                        ...(this.options.tags ?? []),
                    ],
                    metas: {
                        serviceName: this.options.serviceName,
                        ...(this.options.metas ?? {
                        }),
                    },
                }
            )
            this.winstonService.log(
                WinstonLog.ConsulRegisterSuccessfully,
                {
                    id: envConfig().k8s.global.podName,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ConsulRegisterFailed,
                {
                    error: error.message,
                }
            )
        }
    }
    /**
     * Deregister the executor service from Consul.
     */
    async onApplicationShutdown(): Promise<void> {
        if (!this.options.enablePrometheusDnsDiscovery) {
            return
        }
        await this.consulRegisterService.agentServiceDeregister(
            envConfig().k8s.global.podName
        )
    }
}

import {
    Injectable,
    OnModuleInit,
} from "@nestjs/common"
import {
    Gauge,
    Registry,
} from "prom-client"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    envConfig,
} from "@modules/env"
import {
    MetricName,
} from "../enums"
import {
    InjectPrometheusRegistry,
} from "../prometheus.decorators"

/**
 * Service for bot count Prometheus metric.
 *
 * @example
 * await botCountMetricService.set(10)
 */
@Injectable()
export class BotCountMetricService implements OnModuleInit {
    private gauge: Gauge<string>

    constructor(
        @InjectPrometheusRegistry()
        private readonly registry: Registry,
        private readonly winstonService: WinstonService,
    ) {
        this.gauge = new Gauge(
            {
                name: MetricName.BotCount,
                help: "Current number of bots assigned to this executor",
                registers: [this.registry],
                labelNames: ["kani_executor"],
            }
        )
    }
    /**
     * On module init.
     * @returns void.
     */
    onModuleInit(): void {
        this.winstonService.log(
            WinstonLog.MetricInitialized,
            {
                metricName: MetricName.BotCount,
                executorId: envConfig().executor.id,
            },
        )
    }
    /**
     * Set the current bot count.
     *
     * @param count - Number of bots
     *
     * @example
     * botCountMetricService.set(10)
     */
    set(count: number): void {
        this.gauge.set({
            "kani_executor": envConfig().executor.id 
        },
        count)
    }
}

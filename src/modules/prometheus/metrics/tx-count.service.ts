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
 * Service for transaction count Prometheus metric.
 *
 * @example
 * await txCountMetricService.add(1)
 */
@Injectable()
export class TxCountMetricService implements OnModuleInit {
    private gauge: Gauge<string>

    constructor(
        @InjectPrometheusRegistry()
        private readonly registry: Registry,
        private readonly winstonService: WinstonService,
    ) {
        this.gauge = new Gauge(
            {
                name: MetricName.TxCount,
                help: "Current number of transactions executed by this executor",
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
                metricName: MetricName.TxCount,
                executorId: envConfig().executor.id,
            },
        )
    }
    /**
     * Add to the current transaction count.
     *
     * @param count - Number of transactions to add
     *
     * @example
     * txCountMetricService.add(1)
     */
    add(count: number): void {
        this.gauge.inc({
            "kani_executor": envConfig().executor.id 
        },
        count)
    }
}

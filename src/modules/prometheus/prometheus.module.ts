import {
    DynamicModule,
    Module,
    Provider,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./prometheus.module-definition"
import {
    createPrometheusRegistryProvider,
} from "./prometheus.providers"
import {
    PrometheusController,
} from "./prometheus.controller"
import {
    BotCountMetricService,
} from "./metrics"
import {
    MetricName,
} from "./enums"

/**
 * Prometheus module.
 * @module PrometheusModule
 */
@Module({
})
export class PrometheusModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [ 
        ]
        if (options.metricNames?.includes(MetricName.BotCount)) {
            providers.push(BotCountMetricService)
        }
        return {
            ...dynamicModule,
            controllers: [
                PrometheusController,
            ],
            providers: [
                ...dynamicModule.providers || [],
                createPrometheusRegistryProvider(),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}

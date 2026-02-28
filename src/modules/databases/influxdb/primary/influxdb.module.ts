import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./influxdb.module-definition"
import {
    createInfluxdbPrimaryProvider 
} from "./influxdb.providers"
import {
    PrimaryInfluxdbPriceBucketService,
    PrimaryInfluxdbWindowResultBucketService,
} from "./buckets"
import {
    PrimaryInfluxdbLifecycleService 
} from "./influxdb-lifecycle.service"
/**
 * Primary InfluxDB module for the primary InfluxDB connection.
 */
@Module({
})
export class PrimaryInfluxdbModule extends ConfigurableModuleClass {
    /**
     * Register the Primary InfluxDB module.
     * @returns The DynamicModule for the Primary InfluxDB module.
     */
    public static register(options: typeof OPTIONS_TYPE): DynamicModule {
        // register the module
        const dynamicModule = super.register(options)
        // create the providers
        const providers: Array<Provider> = [
            createInfluxdbPrimaryProvider(),
            PrimaryInfluxdbPriceBucketService,
            PrimaryInfluxdbWindowResultBucketService,
            PrimaryInfluxdbLifecycleService,
        ]
        // return the dynamic module
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }   
}

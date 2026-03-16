import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./runtimes.module-definition"
import {
    RuntimesFactoryService 
} from "./runtimes-factory.service"
import {
    RuntimeContextService 
} from "./runtime-context.service"
import {
    HandleClmmPositionOpenRequestedEventService, 
    HandleDlmmPositionOpenRequestedEventService,
    HandleOpenPositionService,
    HandleClmmPositionCloseRequestedEventService,
    HandleDlmmPositionCloseRequestedEventService,
    HandleClosePositionService,
    HandleReconcileBalanceService,
    HandleTransferFeesService,
    HandleWithdrawService,
    HandleViolateIndicatorsService,
    HandleNotSyncedService,
} from "./handlers"
import {
    InfluxdbPriceCacheService,
    InfluxdbVolumeCacheService,
    OpService,
    RelativePriceBuilderService,
    PctCalculatorService,
    RegressionCalculatorService,
} from "./violate-calculators"

/**
 * Runtimes Module
 * 
 * Provides runtime services for the executor.
 * 
 * @example
 * RuntimesModule.register({
 *   isGlobal: true,
 * })
 */
@Module({
})
export class RuntimesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                ...dynamicModule.imports || [],
            ],
            providers: [
                ...dynamicModule.providers || [], 
                RuntimesFactoryService,
                HandleClmmPositionOpenRequestedEventService,
                HandleDlmmPositionOpenRequestedEventService,
                HandleReconcileBalanceService,
                HandleTransferFeesService,
                HandleOpenPositionService,
                HandleClosePositionService,
                HandleClmmPositionCloseRequestedEventService,
                HandleDlmmPositionCloseRequestedEventService,
                HandleWithdrawService,
                HandleViolateIndicatorsService,
                HandleNotSyncedService,
                InfluxdbPriceCacheService,
                InfluxdbVolumeCacheService,
                OpService,
                RelativePriceBuilderService,
                PctCalculatorService,
                RegressionCalculatorService,
                RuntimeContextService,
            ],
            exports: [
                RuntimesFactoryService,
                InfluxdbPriceCacheService,
                InfluxdbVolumeCacheService,
            ],
        }
    }
}   
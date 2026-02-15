import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./diagnostics.module-definition"
import {
    PriceDiagnosticService 
} from "./price.service"
import {
    DynamicLiquidityPoolInfoDiagnosticService 
} from "./dynamic-liquidity-pool-info.service"
import {
    LiquidityPoolSyncedDiagnosticService 
} from "./liquidity-pools-synced.service"

@Module({
})
export class DiagnosticsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                DynamicLiquidityPoolInfoDiagnosticService,
                PriceDiagnosticService, 
                LiquidityPoolSyncedDiagnosticService,
            ],
            exports: [
                DynamicLiquidityPoolInfoDiagnosticService,
                PriceDiagnosticService, 
                LiquidityPoolSyncedDiagnosticService,
            ],
        }
    }
}   
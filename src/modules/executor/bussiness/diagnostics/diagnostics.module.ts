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
    DiagnosticsService 
} from "./diagnostics.service"
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
                DiagnosticsService,
            ],
        }
    }
}   
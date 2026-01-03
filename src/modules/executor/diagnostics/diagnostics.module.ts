import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./diagnostics.module-definition"
import { PythPriceDiagnosticService } from "./pyth-price.service"
@Module({})
export class DiagnosticsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                PythPriceDiagnosticService, 
            ],
        }
    }
}   
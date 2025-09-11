import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./swap.module-definition"
import { createCetusAggregator, createSevenKAggregator } from "./sui-swap.providers"
import { SuiSwapService } from "./sui-swap.service"

@Module({})
export class SwapModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        const providers: Array<Provider> = [
            createCetusAggregator(),
            createSevenKAggregator(),
            SuiSwapService
        ]

        return {
            ...dynamicModule,
            imports: [
                ...imports,
            ],
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ]
        }
    }
}
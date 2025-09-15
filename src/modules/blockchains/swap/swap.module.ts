import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./swap.module-definition"
import { createCetusAggregator, createSevenKAggregator } from "./sui-swap.providers"
import { SuiSwapService } from "./sui-swap.service"
import { SwapService } from "./swap.service"
import { GasSuiSwapUtilsService } from "./gas-sui-swap-utils.service"
import { FeeToService } from "./fee-to.service"
import { SuiForceSwapService } from "./sui-force-swap.service"
import { ZapService } from "./zap.service"

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
            SuiSwapService,
            FeeToService,
            GasSuiSwapUtilsService,
            SuiForceSwapService,
            SwapService,
            ZapService
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
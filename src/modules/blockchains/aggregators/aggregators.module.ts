import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./aggregators.module-definition"   
import { JupiterService } from "./jupiter.service"
import { SolanaAggregatorSelectorService } from "./solana-aggregator-selector.service"
import { createJupiterAggregatorSdkProvider } from "./aggregators.providers"

@Module({})
export class AggregatorsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                JupiterService,
                createJupiterAggregatorSdkProvider(),   
                SolanaAggregatorSelectorService,
            ],
            exports: [
                SolanaAggregatorSelectorService,
                JupiterService,
            ],
        }
    }
}
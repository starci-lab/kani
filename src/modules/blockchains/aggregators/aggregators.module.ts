import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./aggregators.module-definition"   
import { JupiterService } from "./jupiter.service"
import { SolanaAggregatorSelectorService } from "./solana-aggregator-selector.service"
import { SevenKAggregatorService } from "./7k.service"
import { CetusAggregatorService } from "./cetus-aggregator.service"
import { SuiAggregatorSelectorService } from "./sui-aggregator-selector.service"

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
                CetusAggregatorService,
                SevenKAggregatorService,   
                SolanaAggregatorSelectorService,
                SuiAggregatorSelectorService,
            ],
            exports: [
                SolanaAggregatorSelectorService,
                SuiAggregatorSelectorService,
                JupiterService,
            ],
        }
    }
}
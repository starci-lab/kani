import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./balance.module-definition"
import {
    BalanceService 
} from "./balance.service"
import {
    BalanceFetcherService 
} from "./fetcher.service"
import {
    SwapMathService 
} from "../math/swap.service"
import {
    GasStatusService 
} from "./gas-status.service"
import {
    QuoteRatioService 
} from "../math/quote-ratio.service"
import {
    SolanaBalanceService,
    SolanaBalanceFetcherService 
} from "./solana"
import {
    SuiBalanceService,
    SuiBalanceFetcherService 
} from "./sui"

@Module({
})
export class BalanceModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            SolanaBalanceFetcherService,
            SuiBalanceFetcherService,
            BalanceFetcherService,
            SwapMathService,
            GasStatusService,
            QuoteRatioService,
        ]
        if (!options.fetcherOnly) {
            providers.push(
                SolanaBalanceService,
                SuiBalanceService,
                BalanceService,
            )
        }
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}

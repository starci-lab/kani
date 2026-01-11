import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./balance.module-definition"
import { BalanceService } from "./balance.service"
import { SwapMathService } from "../math/swap.service"
import { GasStatusService } from "./gas-status.service"
import { QuoteRatioService } from "../math/quote-ratio.service"
import { SuiBalanceService } from "./sui.service"
import { BalanceEligibilityService } from "./eligibility.service"
import { SolanaBalanceService } from "./solana.service"

@Module({})
export class BalanceModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        if (!options.utilitiesOnly) {
            providers.push(
                SolanaBalanceService,
                SuiBalanceService,
                BalanceService,
                SwapMathService,
                GasStatusService,
                QuoteRatioService,
                BalanceEligibilityService,
            )
        }
        providers.push(BalanceEligibilityService)
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

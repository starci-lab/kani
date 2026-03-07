import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./balance.module-definition"
import {
    ReconcileBalanceEnqueueService 
} from "./reconcile-enqueue.service"
import {
    WithdrawEnqueueService 
} from "./withdraw-enqueue.service"
import {
    BalanceActionService 
} from "./action.service"
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
    SolanaBalanceFetcherService,
    SolanaTransferFeesService,
    SolanaWithdrawActionService,
    SolanaReconcileBalanceActionService,
} from "./solana"
import {
    SuiBalanceService,
    SuiBalanceFetcherService,
    SuiTransferFeesService,
    SuiWithdrawActionService,
    SuiReconcileBalanceActionService,
} from "./sui"

@Module({
})
export class BalanceModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        
        // Always add base services
        providers.push(
            SwapMathService,
            GasStatusService,
            QuoteRatioService,
        )
        
        // Add fetcher services if enabled
        if (options.enable?.fetcher !== false) {
            providers.push(
                SolanaBalanceFetcherService,
                SuiBalanceFetcherService,
                BalanceFetcherService,
            )
        }
        
        // Add action services if enabled
        if (options.enable?.action !== false) {
            providers.push(
                SolanaWithdrawActionService,
                SolanaReconcileBalanceActionService,
                SolanaTransferFeesService,
                SolanaBalanceService,
                SuiWithdrawActionService,
                SuiReconcileBalanceActionService,
                SuiTransferFeesService,
                SuiBalanceService,
                BalanceActionService,
            )
        }
        
        // Add enqueue services if enabled
        if (options.enable?.enqueue !== false) {
            providers.push(
                ReconcileBalanceEnqueueService,
                WithdrawEnqueueService,
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

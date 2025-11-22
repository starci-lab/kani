
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./balance.module-definition"
import { SolanaBalanceService } from "./solana.service"
import { BalanceService } from "./balance.service"
import { SwapMathService } from "./swap-math.service"
import { GasStatusService } from "./gas-status.service"
import { QuoteRatioService } from "./quote-ratio.service"

@Module({
    providers: [
        SolanaBalanceService, 
        BalanceService,
        SwapMathService,
        GasStatusService,
        QuoteRatioService,
    ],
    exports: [
        BalanceService,
        SwapMathService,
        QuoteRatioService,
    ],
})
export class BalancesModule extends ConfigurableModuleClass {}

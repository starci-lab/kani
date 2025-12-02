
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./balance.module-definition"
import { SolanaBalanceService } from "./solana.service"
import { BalanceService } from "./balance.service"
import { SwapMathService } from "../math/swap.service"
import { GasStatusService } from "./gas-status.service"
import { QuoteRatioService } from "../math/quote-ratio.service"
import { ProfitabilityMathService } from "../math/profitability.service"

@Module({
    providers: [
        SolanaBalanceService, 
        BalanceService,
        SwapMathService,
        GasStatusService,
        QuoteRatioService,
        ProfitabilityMathService,
    ],
    exports: [
        BalanceService,
        SwapMathService,
        QuoteRatioService,
        ProfitabilityMathService,
        GasStatusService,
        SolanaBalanceService,
    ],
})
export class BalancesModule extends ConfigurableModuleClass {}


import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./balance.module-definition"
import { SolanaBalanceService } from "./solana.service"
import { BalanceService } from "./balance.service"
import { SwapMathService } from "../math/swap.service"
import { GasStatusService } from "./gas-status.service"
import { QuoteRatioService } from "../math/quote-ratio.service"
import { SuiBalanceService } from "./sui.service"
import { BalanceEligibilityService } from "./eligibility.service"

@Module({
    providers: [
        SolanaBalanceService, 
        SuiBalanceService,
        BalanceService,
        SwapMathService,
        GasStatusService,
        QuoteRatioService,
        BalanceEligibilityService,
    ],
    exports: [
        BalanceService,
        SwapMathService,
        QuoteRatioService,
        GasStatusService,
        SolanaBalanceService,
        BalanceEligibilityService,
    ],
})
export class BalanceModule extends ConfigurableModuleClass {}

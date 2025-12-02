import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./math.module-definition"
import { TickMathService } from "./tick.service"
import { ZapMathService } from "./zap.service"
import { PoolMathService } from "./pool.service"
import { EnsureMathService } from "./ensure.service"
import { FeeService } from "./fee.service"
import { SwapMathService } from "./swap.service"
import { ProfitabilityMathService } from "./profitability.service"
import { QuoteRatioService } from "./quote-ratio.service"
@Module({
    providers: [
        TickMathService,
        ZapMathService,
        PoolMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        ProfitabilityMathService,
        QuoteRatioService,
    ],
    exports: [
        TickMathService,
        ZapMathService,
        PoolMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        ProfitabilityMathService,
        QuoteRatioService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}

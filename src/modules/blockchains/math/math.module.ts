import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./math.module-definition"
import { TickMathService } from "./tick.service"
import { PoolMathService } from "./pool.service"
import { EnsureMathService } from "./ensure.service"
import { FeeService } from "./fee.service"
import { SwapMathService } from "./swap.service"
import { QuoteRatioService } from "./quote-ratio.service"
import { PositionValueMathService } from "./position-value.service"
@Module({
    providers: [
        TickMathService,
        PoolMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueMathService,
    ],
    exports: [
        TickMathService,
        PoolMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueMathService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}

import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./math.module-definition"
import {
    TickMathService 
} from "./tick.service"
import {
    EnsureMathService 
} from "./ensure.service"
import {
    FeeService 
} from "./fee.service"
import {
    SwapMathService 
} from "./swap.service"
import {
    QuoteRatioService 
} from "./quote-ratio.service"
import {
    PositionValueMathService 
} from "./position-value.service"
import {
    PriceService 
} from "./price.service"
@Module({
    providers: [
        TickMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueMathService,
        PriceService,
    ],
    exports: [
        TickMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueMathService,
        PriceService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}

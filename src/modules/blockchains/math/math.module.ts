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
    PositionValueService 
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
        PositionValueService,
        PriceService,
    ],
    exports: [
        TickMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueService,
        PriceService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}

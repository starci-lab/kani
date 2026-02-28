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
import {
    PriceSelectionService 
} from "./price-selection.service"

/**
 * Math module.
 * Provides mathematical services for blockchains.
 */
@Module({
    providers: [
        TickMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueService,
        PriceService,
        PriceSelectionService,
    ],
    exports: [
        TickMathService,
        EnsureMathService,
        FeeService,
        SwapMathService,
        QuoteRatioService,
        PositionValueService,
        PriceService,
        PriceSelectionService,
    ],
})
export class MathModule extends ConfigurableModuleClass {}

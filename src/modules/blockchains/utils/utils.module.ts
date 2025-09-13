import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"
import { SuiExecutionService } from "./sui-execution.service"
import { PriceRatioService } from "./price-ratio.service"
import { FeeToService } from "./fee-to.service"
import { TickManagerService } from "./tick-manager.service"
import { ZapCalculatorService } from "./zap-calculator.service"
import { TickMathService } from "./tick-math.service"

@Module({
    providers: [
        SuiCoinManagerService,
        SuiExecutionService,
        PriceRatioService,
        FeeToService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
    ],
    exports: [
        SuiCoinManagerService,
        SuiExecutionService,
        PriceRatioService,
        FeeToService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
    ],
})
export class UtilsModule extends ConfigurableModuleClass {}

import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"
import { SuiExecutionService } from "./sui-execution.service"
import { PriceRatioService } from "./price-ratio.service"
import { FeeToService } from "./fee-to.service"
import { TickManagerService } from "./tick-manager.service"
import { ZapCalculatorService } from "./zap-calculator.service"
import { TickMathService } from "./tick-math.service"
import { LiquidityPoolService } from "./liquidity-pool.service"

@Module({
    providers: [
        SuiCoinManagerService,
        SuiExecutionService,
        PriceRatioService,
        FeeToService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
        LiquidityPoolService
    ],
    exports: [
        SuiCoinManagerService,
        SuiExecutionService,
        PriceRatioService,
        FeeToService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
        LiquidityPoolService
    ],
})
export class UtilsModule extends ConfigurableModuleClass {}

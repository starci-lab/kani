import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"
import { SuiExecutionService } from "./sui-execution.service"
import { ZapProtectionService } from "./zap-protection.service"
import { TickManagerService } from "./tick-manager.service"
import { ZapCalculatorService } from "./zap-calculator.service"
import { TickMathService } from "./tick-math.service"
import { SolanaTokenManagerService } from "./solana-token-manager.service"
import { TickService } from "./tick.service"
import { PoolMathService } from "./pool-math.service"

@Module({
    providers: [
        SuiCoinManagerService,
        SuiExecutionService,
        ZapProtectionService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
        SolanaTokenManagerService,
        TickService,
        PoolMathService,
    ],
    exports: [
        SuiCoinManagerService,
        SuiExecutionService,
        ZapProtectionService,
        TickManagerService,
        ZapCalculatorService,
        TickMathService,
        SolanaTokenManagerService,
        TickService,
        PoolMathService,
    ],
})
export class UtilsModule extends ConfigurableModuleClass {}

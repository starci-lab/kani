import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"
import { SuiExecutionService } from "./sui-execution.service"
import { SolanaTokenManagerService } from "./solana-token-manager.service"

@Module({
    providers: [
        SuiCoinManagerService,
        SuiExecutionService,
        SolanaTokenManagerService,
    ],
    exports: [
        SuiCoinManagerService,
        SuiExecutionService,
        SolanaTokenManagerService,
    ],
})
export class UtilsModule extends ConfigurableModuleClass {}

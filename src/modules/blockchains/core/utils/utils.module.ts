import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"
import { SuiExecutionService } from "./sui-execution.service"

@Module({
    providers: [SuiCoinManagerService, SuiExecutionService],
    exports: [SuiCoinManagerService, SuiExecutionService],
})
export class UtilsModule extends ConfigurableModuleClass {}
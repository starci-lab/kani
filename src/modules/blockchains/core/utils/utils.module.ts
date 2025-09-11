import { Module } from "@nestjs/common"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { ConfigurableModuleClass } from "./utils.module-definition"

@Module({
    providers: [SuiCoinManagerService],
    exports: [SuiCoinManagerService],
})
export class UtilsModule extends ConfigurableModuleClass {}
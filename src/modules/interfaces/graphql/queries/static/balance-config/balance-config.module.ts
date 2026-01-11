import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./balance-config.module-definition"
import { BalanceConfigService } from "./balance-config.service"
import { BalanceConfigResolver } from "./balance-config.resolver"

@Module({
    providers: [
        BalanceConfigService,
        BalanceConfigResolver,
    ],
})
export class BalanceConfigModule extends ConfigurableModuleClass {}


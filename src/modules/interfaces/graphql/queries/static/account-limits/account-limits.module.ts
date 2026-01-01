import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./account-limits.module-definition"
import { AccountLimitsService } from "./account-limits.service"
import { AccountLimitsResolver } from "./account-limits.resolver"

@Module({
    providers: [
        AccountLimitsService,
        AccountLimitsResolver,
    ],
})
export class AccountLimitsModule extends ConfigurableModuleClass {}


import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { LiquidityProvisionBotModule } from "./liquidity-provision-bot"

@Module({
    imports: [
        UsersModule.register({}),
        LiquidityProvisionBotModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
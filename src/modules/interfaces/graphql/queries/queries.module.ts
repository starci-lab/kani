import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { LiquidityProvisionBotModule } from "./liquidity-provision-bot"
import { StaticModule } from "./static"

@Module({
    imports: [
        UsersModule.register({}),
        LiquidityProvisionBotModule.register({}),
        StaticModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
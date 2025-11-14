import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { BotModule } from "./bot"
import { StaticModule } from "./static"

@Module({
    imports: [
        UsersModule.register({}),
        BotModule.register({}),
        StaticModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
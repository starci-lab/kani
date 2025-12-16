import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { BotModule } from "./bot"
import { StaticModule } from "./static"
import { DynamicGraphQLModule } from "./dynamic"
import { ActivityModule } from "./activity"

@Module({
    imports: [
        UsersModule.register({}),
        BotModule.register({}),
        StaticModule.register({}),
        DynamicGraphQLModule.register({}),
        ActivityModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { BotsModule } from "./bots"
import { StaticModule } from "./static"
import { DynamicGraphQLModule } from "./dynamic"
import { ActivityModule } from "./activity"

@Module({
    imports: [
        UsersModule.register({}),
        BotsModule.register({}),
        StaticModule.register({}),
        DynamicGraphQLModule.register({}),
        ActivityModule.register({}),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
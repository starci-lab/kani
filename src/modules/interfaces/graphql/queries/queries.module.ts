import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./queries.module-definition"
import { UsersModule } from "./users"
import { BotsModule } from "./bots"
import { StaticModule } from "./static"
import { ActivityModule } from "./activity"

@Module({
    imports: [
        UsersModule.register({ isGlobal: true }),
        BotsModule.register({ isGlobal: true }),
        StaticModule.register({ isGlobal: true }),
        ActivityModule.register({ isGlobal: true }),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
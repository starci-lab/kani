import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./queries.module-definition"
import {
    UsersModule 
} from "./users"
import {
    BotsModule 
} from "./bots"
import {
    StaticModule 
} from "./static"
import {
    TransactionsModule 
} from "./transactions"
import {
    PositionsModule 
} from "./positions"
import {
    HistoriesModule
} from "./histories"

@Module({
    imports: [
        UsersModule.register({
            isGlobal: true 
        }),
        BotsModule.register({
            isGlobal: true 
        }),
        StaticModule.register({
            isGlobal: true 
        }),
        TransactionsModule.register({
            isGlobal: true,
        }),
        PositionsModule.register({
            isGlobal: true,
        }),
        HistoriesModule.register({
            isGlobal: true,
        }),
    ],
})
export class QueriesModule extends ConfigurableModuleClass {}
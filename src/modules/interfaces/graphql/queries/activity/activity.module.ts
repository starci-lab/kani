import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./activity.module-definition"
import { TransactionsModule } from "./transactions"
import { PositionsModule } from "./positions"
import { Transactions2Module } from "./transactions2"
import { Positions2Module } from "./positions2"
import { HistoryModule } from "./history"

@Module({
    imports: [
        TransactionsModule.register({}),
        PositionsModule.register({}),
        Transactions2Module.register({}),
        Positions2Module.register({}),
        HistoryModule.register({}),
    ],
})
export class ActivityModule extends ConfigurableModuleClass {}
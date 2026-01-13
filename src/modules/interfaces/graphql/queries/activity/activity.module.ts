import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./activity.module-definition"
import { TransactionsModule } from "./transactions"
import { TransactionsV2Module } from "./transactions-v2"
import { PositionsModule } from "./positions"
import { PositionsV2Module } from "./positions-v2"
import { HistoryModule } from "./history"
import { HistoryV2Module } from "./history-v2"

@Module({
    imports: [
        TransactionsModule.register({}),
        TransactionsV2Module.register({}),
        PositionsModule.register({}),
        PositionsV2Module.register({}),
        HistoryModule.register({}),
        HistoryV2Module.register({}),
    ],
})
export class ActivityModule extends ConfigurableModuleClass {}
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./activity.module-definition"
import {
    TransactionsModule 
} from "./transactions"
import {
    TransactionsV2Module 
} from "./transactions-v2"
import {
    PositionsModule 
} from "./positions"
import {
    PositionsV2Module 
} from "./positions-v2"
import {
    HistoryModule 
} from "./history"
import {
    HistoryV2Module 
} from "./history-v2"

@Module({
    imports: [
        TransactionsModule.register({
            isGlobal: true,
        }),
        TransactionsV2Module.register({
            isGlobal: true,
        }),
        PositionsModule.register({
            isGlobal: true,
        }),
        PositionsV2Module.register({
            isGlobal: true,
        }),
        HistoryModule.register({
            isGlobal: true,
        }),
        HistoryV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class ActivityModule extends ConfigurableModuleClass {}
import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./histories.module-definition"
import {
    HistoryModule,
} from "./history"
import {
    HistoryV2Module,
} from "./history-v2"

@Module({
    imports: [
        HistoryModule.register({
            isGlobal: true,
        }),
        HistoryV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class HistoriesModule extends ConfigurableModuleClass {}



import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./history-v2.module-definition"
import {
    HistoryV2Service 
} from "./history-v2.service"
import {
    HistoryV2Resolver 
} from "./history-v2.resolver"

@Module({
    providers: [
        HistoryV2Service,
        HistoryV2Resolver,
    ],
})
export class HistoryV2Module extends ConfigurableModuleClass {}


import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./update-bot-chart-config-v2.module-definition"
import {
    UpdateBotChartConfigV2Resolver
} from "./update-bot-chart-config-v2.resolver"
import {
    UpdateBotChartConfigV2Service
} from "./update-bot-chart-config-v2.service"

@Module({
    providers: [
        UpdateBotChartConfigV2Service,
        UpdateBotChartConfigV2Resolver,
    ],
})
export class UpdateBotChartConfigV2Module extends ConfigurableModuleClass {}

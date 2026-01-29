import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./update-bot-positions-performance-display-mode-v2.module-definition"
import {
    UpdateBotPositionsPerformanceDisplayModeV2Service 
} from "./update-bot-positions-performance-display-mode-v2.service"
import {
    UpdateBotPositionsPerformanceDisplayModeV2Resolver 
} from "./update-bot-positions-performance-display-mode-v2.resolver"

@Module({
    providers: [
        UpdateBotPositionsPerformanceDisplayModeV2Service,
        UpdateBotPositionsPerformanceDisplayModeV2Resolver,
    ],
})
export class UpdateBotPositionsPerformanceDisplayModeV2Module extends ConfigurableModuleClass {}

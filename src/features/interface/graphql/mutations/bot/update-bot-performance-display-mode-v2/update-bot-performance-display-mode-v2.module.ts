import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./update-bot-performance-display-mode-v2.module-definition"
import {
    UpdateBotPerformanceDisplayModeV2Service 
} from "./update-bot-performance-display-mode-v2.service"
import {
    UpdateBotPerformanceDisplayModeV2Resolver 
} from "./update-bot-performance-display-mode-v2.resolver"

@Module({
    providers: [
        UpdateBotPerformanceDisplayModeV2Service,
        UpdateBotPerformanceDisplayModeV2Resolver,
    ],
})
export class UpdateBotPerformanceDisplayModeV2Module extends ConfigurableModuleClass {}

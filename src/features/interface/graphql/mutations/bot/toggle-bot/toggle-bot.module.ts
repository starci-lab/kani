import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./toggle-bot.module-definition"
import {
    ToggleBotService 
} from "./toggle-bot.service"
import {
    ToggleBotResolver 
} from "./toggle-bot.resolver"

@Module({
    providers: [
        ToggleBotService,
        ToggleBotResolver,
    ],
})
export class ToggleBotModule extends ConfigurableModuleClass {}


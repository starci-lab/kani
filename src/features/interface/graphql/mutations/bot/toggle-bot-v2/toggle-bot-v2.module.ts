import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./toggle-bot-v2.module-definition"
import {
    ToggleBotV2Service 
} from "./toggle-bot-v2.service"
import {
    ToggleBotV2Resolver 
} from "./toggle-bot-v2.resolver"

@Module({
    providers: [
        ToggleBotV2Service,
        ToggleBotV2Resolver,
    ],
})
export class ToggleBotV2Module extends ConfigurableModuleClass {}


import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./bot-v2.module-definition"
import {
    BotV2Service 
} from "./bot-v2.service"
import {
    BotV2Resolver 
} from "./bot-v2.resolver"

@Module({
    providers: [
        BotV2Service,
        BotV2Resolver,
    ],
})
export class BotV2Module extends ConfigurableModuleClass {}


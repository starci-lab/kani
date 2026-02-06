import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./create-bot.module-definition"
import {
    CreateBotService 
} from "./create-bot.service"
import {
    CreateBotResolver 
} from "./create-bot.resolver"

@Module({
    providers: [
        CreateBotService,
        CreateBotResolver,
    ],
})
export class CreateBotModule extends ConfigurableModuleClass {}


import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BotService } from "./bot.service"
import { BotResolver } from "./bot.resolver"

@Module({
    providers: [
        BotService,
        BotResolver,
    ],
})
export class BotModule extends ConfigurableModuleClass {}


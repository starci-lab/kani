import { Module } from "@nestjs/common"
import { BotService } from "./bot.service"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BotResolver } from "./bot.resolver"

@Module({
    providers: [BotService, BotResolver],
})
export class BotModule extends ConfigurableModuleClass {}
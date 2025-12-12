import { Module } from "@nestjs/common"
import { BotService } from "./bot.service"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BotResolver } from "./bot.resolver"
import { BotV2Service } from "./bot-v2.service"
import { BotV2Resolver } from "./bot-v2.resolver"

@Module({
    providers: [
        BotService, 
        BotResolver, 
        BotV2Service, 
        BotV2Resolver
    ],
})
export class BotModule extends ConfigurableModuleClass {}
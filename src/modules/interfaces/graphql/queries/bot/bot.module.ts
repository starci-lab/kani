import { Module } from "@nestjs/common"
import { BotResolver } from "./bot.resolvers"
import { BotService } from "./bot.service"
import { ConfigurableModuleClass } from "./bot.module-definition"

@Module({
    providers: [BotResolver, BotService],
})
export class BotModule extends ConfigurableModuleClass {}
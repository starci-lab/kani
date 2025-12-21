import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BotModule } from "./bot"

@Module({
    imports: [
        BotModule
    ],
})
export class BotsModule extends ConfigurableModuleClass {}
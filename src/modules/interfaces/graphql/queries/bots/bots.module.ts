import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotModule } from "./bot"

@Module({
    imports: [
        BotModule.register({}),
    ],
})
export class BotsModule extends ConfigurableModuleClass {}
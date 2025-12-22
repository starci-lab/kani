import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotModule } from "./bot"
import { BotsModule as BotsCursorModule } from "./bots"
import { Bots2Module } from "./bots2"

@Module({
    imports: [
        BotModule.register({}),
        BotsCursorModule.register({}),
        Bots2Module.register({}),
    ],
})
export class BotsModule extends ConfigurableModuleClass {}
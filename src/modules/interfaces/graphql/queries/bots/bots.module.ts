import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotModule } from "./bot"
import { BotV2Module } from "./bot-v2"
import { BotsModule as BotsCursorModule } from "./bots"
import { BotsV2Module } from "./bots-v2"
import { Bots2Module } from "./bots2"
import { Bots2V2Module } from "./bots2-v2"
import { FeesModule } from "./fees"
import { ReservesModule } from "./reserves"

@Module({
    imports: [
        BotModule.register({
            isGlobal: true,
        }),
        BotV2Module.register({
            isGlobal: true,
        }),
        BotsCursorModule.register({
            isGlobal: true,
        }),
        BotsV2Module.register({
            isGlobal: true,
        }),
        Bots2Module.register({
            isGlobal: true,
        }),
        Bots2V2Module.register({
            isGlobal: true,
        }),
        FeesModule.register({
            isGlobal: true,
        }),
        ReservesModule.register({
            isGlobal: true,
        }),
    ]
})
export class BotsModule extends ConfigurableModuleClass {}
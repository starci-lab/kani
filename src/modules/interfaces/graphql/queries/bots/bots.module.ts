import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotModule } from "./bot"
import { BotsModule as BotsCursorModule } from "./bots"
import { Bots2Module } from "./bots2"
import { FeesModule } from "./fees"
import { ReservesModule } from "./reserves"

@Module({
    imports: [
        BotModule.register({
            isGlobal: true,
        }),
        BotsCursorModule.register({
            isGlobal: true,
        }),
        Bots2Module.register({
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
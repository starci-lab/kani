import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotModule } from "./bot"
import { BotV2Module } from "./bot-v2"
import { BotsModule as BotsCursorModule } from "./bots"
import { BotsV2Module } from "./bots-v2"
import { BotsModule as BotsQueryModule } from "./bots"
import { FeesModule } from "./fees"
import { FeesV2Module } from "./fees-v2"
import { ReservesModule } from "./reserves"
import { ReservesV2Module } from "./reserves-v2"
import { FundingSnapshotV2Module } from "./funding-snapshot-v2"

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
        BotsQueryModule.register({
            isGlobal: true,
        }),
        BotsV2Module.register({
            isGlobal: true,
        }),
        FeesModule.register({
            isGlobal: true,
        }),
        FeesV2Module.register({
            isGlobal: true,
        }),
        ReservesModule.register({
            isGlobal: true,
        }),
        ReservesV2Module.register({
            isGlobal: true,
        }),
        FundingSnapshotV2Module.register({
            isGlobal: true,
        }),
    ]
})
export class BotsModule extends ConfigurableModuleClass {}
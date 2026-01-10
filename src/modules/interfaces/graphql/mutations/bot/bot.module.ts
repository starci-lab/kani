import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BackupBotPrivateKeyModule } from "./backup-bot-private-key"
import { BackupBotPrivateKeyV2Module } from "./backup-bot-private-key-v2"
import { CreateBotModule } from "./create-bot"
import { CreateBotV2Module } from "./create-bot-v2"
import { ToggleBotModule } from "./toggle-bot"
import { ToggleBotV2Module } from "./toggle-bot-v2"

@Module({
    imports: [
        ToggleBotModule.register({
            isGlobal: true,
        }),
        ToggleBotV2Module.register({
            isGlobal: true,
        }),
        BackupBotPrivateKeyModule.register({
            isGlobal: true,
        }),
        BackupBotPrivateKeyV2Module.register({
            isGlobal: true,
        }),
        CreateBotModule.register({
            isGlobal: true,
        }),
        CreateBotV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class BotModule extends ConfigurableModuleClass {}
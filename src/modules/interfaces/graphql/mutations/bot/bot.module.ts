import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BackupBotPrivateKeyModule } from "./backup-bot-private-key"
import { CreateBotModule } from "./create-bot"
import { ToggleBotModule } from "./toggle-bot"
import { CreateBotV2Module } from "./create-bot-v2"

@Module({
    imports: [
        ToggleBotModule.register({
            isGlobal: true,
        }),
        BackupBotPrivateKeyModule.register({
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
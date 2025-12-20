import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bot.module-definition"
import { BackupBotPrivateKeyModule } from "./backup-bot-private-key"
import { CreateBotModule } from "./create-bot"

@Module({
    imports: [
        BackupBotPrivateKeyModule,
        CreateBotModule,
    ],
})
export class BotModule extends ConfigurableModuleClass {}
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./backup-bot-private-key.module-definition"
import { BackupBotPrivateKeyService } from "./backup-bot-private-key.service"
import { BackupBotPrivateKeyResolver } from "./backup-bot-private-key.resolver"

@Module({
    providers: [
        BackupBotPrivateKeyService,
        BackupBotPrivateKeyResolver,
    ],
})
export class BackupBotPrivateKeyModule extends ConfigurableModuleClass {}


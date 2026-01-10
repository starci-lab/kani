import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./backup-bot-private-key-v2.module-definition"
import { BackupBotPrivateKeyV2Service } from "./backup-bot-private-key-v2.service"
import { BackupBotPrivateKeyV2Resolver } from "./backup-bot-private-key-v2.resolver"

@Module({
    providers: [
        BackupBotPrivateKeyV2Service,
        BackupBotPrivateKeyV2Resolver,
    ],
})
export class BackupBotPrivateKeyV2Module extends ConfigurableModuleClass {}


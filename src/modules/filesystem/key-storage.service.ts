import { Injectable, OnModuleInit } from "@nestjs/common"
import { SmtpConfig } from "./mount.service"
import { MountFilesystemService } from "./mount.service"
import { AsyncService, ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class KeyStorageService implements OnModuleInit {
    public aes: string
    public jwtSecret: string
    public smtpConfig: SmtpConfig
    constructor(
        private readonly mountFilesystemService: MountFilesystemService,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService
    ) {}

    async onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(KeyStorageService.name)
        await this.asyncService.allMustDone([
            (async () => this.aes = await this.mountFilesystemService.aes())(),
            (async () => this.jwtSecret = await this.mountFilesystemService.jwtSecret())(),
            (async () => this.smtpConfig = await this.mountFilesystemService.smtpConfig())()
        ])
        this.readinessWatcherFactoryService.setReady(KeyStorageService.name)
    }
}
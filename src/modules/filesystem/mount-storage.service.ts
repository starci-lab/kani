import { Injectable, OnModuleInit } from "@nestjs/common"
import { ApiKeys, RpcAccessConfigs, SmtpConfig } from "./types"
import { MountFilesystemService } from "./mount.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class MountStorageService implements OnModuleInit {
    public encryptedAesKey: Buffer<ArrayBufferLike>
    public encryptedJwtSecret: Buffer
    public smtpConfig: SmtpConfig
    public rpcAccessConfigs: RpcAccessConfigs
    public apiKeys: ApiKeys
    constructor(
        private readonly mountFilesystemService: MountFilesystemService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(MountStorageService.name)
        this.encryptedJwtSecret = this.mountFilesystemService.encryptedJwtSecret()
        this.smtpConfig = this.mountFilesystemService.smtpConfig()
        this.rpcAccessConfigs = this.mountFilesystemService.rpcAccessConfigs()
        this.apiKeys = this.mountFilesystemService.apiKeys()
        this.encryptedAesKey = this.mountFilesystemService.encryptedAesKey()
        this.readinessWatcherFactoryService.setReady(MountStorageService.name)
    }
}
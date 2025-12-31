import { Injectable, OnModuleInit } from "@nestjs/common"
import { ApiKeys, RpcAccessConfigs, SmtpConfig } from "./types"
import { MountFilesystemService } from "./mount.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class MountStorageService implements OnModuleInit {
    public aesKey: Buffer
    public jwtSecretKey: Buffer
    public smtpConfig: SmtpConfig
    public rpcAccessConfigs: RpcAccessConfigs
    public apiKeys: ApiKeys
    constructor(
        private readonly mountFilesystemService: MountFilesystemService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(MountStorageService.name)
        this.aesKey = this.mountFilesystemService.aesKey()
        this.jwtSecretKey = this.mountFilesystemService.jwtSecretKey()
        this.smtpConfig = this.mountFilesystemService.smtpConfig()
        this.rpcAccessConfigs = this.mountFilesystemService.rpcAccessConfigs()
        this.apiKeys = this.mountFilesystemService.apiKeys()
        this.readinessWatcherFactoryService.setReady(MountStorageService.name)
    }
}
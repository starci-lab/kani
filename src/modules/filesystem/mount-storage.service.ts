import { Injectable, OnModuleInit } from "@nestjs/common"
import { AppConfig, RpcAccessConfigs } from "./types"
import { MountFilesystemService } from "./mount.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class MountStorageService implements OnModuleInit {
    public encryptedJwtSecretKey: Buffer<ArrayBufferLike>
    public encryptedAesKey: Buffer<ArrayBufferLike>
    public cryptoKeyEdSa: string
    public cloudKmsCryptoOperatorSa: string
    public googleDriveUdSa: string
    public appConfig: AppConfig
    public rpcAccessConfigs: RpcAccessConfigs
    constructor(
        private readonly mountFilesystemService: MountFilesystemService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(MountStorageService.name)
        // get app config from mount filesystem service
        this.appConfig = this.mountFilesystemService.appConfig()
        // get secrets from mount filesystem service
        this.encryptedJwtSecretKey = this.mountFilesystemService.encryptedJwtSecretKey()
        // get encrypted aes key from mount filesystem service
        this.encryptedAesKey = this.mountFilesystemService.encryptedAesKey()
        // get crypto key ed sa from mount filesystem service
        this.cryptoKeyEdSa = this.mountFilesystemService.cryptoKeyEdSa()
        // get cloud kms crypto operator sa from mount filesystem service
        this.cloudKmsCryptoOperatorSa = this.mountFilesystemService.cloudKmsCryptoOperatorSa()
        // get google drive ud sa from mount filesystem service
        this.googleDriveUdSa = this.mountFilesystemService.googleDriveUdSa()
        // get rpc access configs from mount filesystem service
        this.rpcAccessConfigs = this.mountFilesystemService.rpcAccessConfigs()
        // set readiness watcher to true
        this.readinessWatcherFactoryService.setReady(MountStorageService.name)
    }
}
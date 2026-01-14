import { Injectable, OnModuleInit } from "@nestjs/common"
import { AppConfig, RpcAccessConfigs } from "./types"
import { MountFilesystemService } from "./mount.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class MountStorageService implements OnModuleInit {
    public encryptedJwtSecretKey: Buffer<ArrayBufferLike>
    public encryptedAesKey: Buffer<ArrayBufferLike>
    public gcpCryptoKeyEdSa: string
    public gcpCloudKmsCryptoOperatorSa: string
    public gcpGoogleDriveUdSa: string
    public appConfig: AppConfig
    public rpcAccessConfigs: RpcAccessConfigs
    public privySignerPrivateKey: string
    public privyAppSecretKey: string
    public coinMarketCapApiKey: string
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
        this.gcpCryptoKeyEdSa = this.mountFilesystemService.gcpCryptoKeyEdSa()
        // get cloud kms crypto operator sa from mount filesystem service
        this.gcpCloudKmsCryptoOperatorSa = this.mountFilesystemService.gcpCloudKmsCryptoOperatorSa()
        // get google drive ud sa from mount filesystem service
        this.gcpGoogleDriveUdSa = this.mountFilesystemService.gcpGoogleDriveUdSa()
        // get rpc access configs from mount filesystem service
        this.rpcAccessConfigs = this.mountFilesystemService.rpcAccessConfigs()
        // get privy signer public key from mount filesystem service
        this.privySignerPrivateKey = this.mountFilesystemService.privySignerPrivateKey()
        // get privy app secret from mount filesystem service
        this.privyAppSecretKey = this.mountFilesystemService.privyAppSecretKey()
        // get coinmarketcap api key from mount filesystem service
        this.coinMarketCapApiKey = this.mountFilesystemService.coinMarketCapApiKey()
        // set readiness watcher to true
        this.readinessWatcherFactoryService.setReady(MountStorageService.name)
    }
}
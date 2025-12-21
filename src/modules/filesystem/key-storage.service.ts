import { Injectable, OnModuleInit } from "@nestjs/common"
import { SmtpConfig } from "./types"
import { MountFilesystemService } from "./mount.service"

@Injectable()
export class KeyStorageService implements OnModuleInit {
    public aesKey: string
    public jwtSecretKey: string
    public smtpConfig: SmtpConfig
    constructor(
        private readonly mountFilesystemService: MountFilesystemService,
    ) {}

    onModuleInit() {
        this.aesKey = this.mountFilesystemService.aesKey()
        this.jwtSecretKey = this.mountFilesystemService.jwtSecretKey()
        this.smtpConfig = this.mountFilesystemService.smtpConfig()
    }
}
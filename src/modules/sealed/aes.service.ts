import { Injectable, OnModuleInit } from "@nestjs/common"
import { EncryptionService } from "@modules/crypto"
import { EncryptedPayload } from "@typedefs"
import { GcpKmsService } from "@modules/gcp"
import { MountStorageService } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import crypto from "crypto"

@Injectable()
export class SealedAesService implements OnModuleInit {
    public sealedKey: Buffer<ArrayBufferLike>
    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async onModuleInit() {
        // get base key from gcp kms
        const baseKey = await this.gcpKmsService.encrypt(this.mountStorageService.aesKey)
        console.log("baseKey", Buffer.from(baseKey).toString("hex"))
        // hash base key with salt
        this.sealedKey = crypto.pbkdf2Sync(
            baseKey,
            envConfig().salt.aesCbc,
            100_000,
            32,
            "sha256"
        )
        console.log("sealedKey", Buffer.from(this.sealedKey).toString("hex"))
    }

    encrypt(data: string): EncryptedPayload {
        return this.encryptionService.encrypt(data, this.sealedKey)
    }

    decrypt(payload: EncryptedPayload): string {
        return this.encryptionService.decrypt(payload, this.sealedKey)
    }
}
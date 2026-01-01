import { Injectable, OnModuleInit } from "@nestjs/common"
import { EncryptionService } from "@modules/crypto"
import { EncryptedPayload } from "@typedefs"
import { GcpKmsService } from "@modules/gcp"
import { MountStorageService } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import crypto from "crypto"

@Injectable()
export class DerivedAesKeyService implements OnModuleInit {
    public derivedKey: Buffer<ArrayBufferLike>
    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async onModuleInit() {
        // get base key from gcp kms
        const key = await this.gcpKmsService.decrypt(this.mountStorageService.encryptedAesKey)
        // hash base key with salt
        this.derivedKey = crypto.pbkdf2Sync(
            key,
            envConfig().salt.aesCbc,
            100_000,
            32,
            "sha256"
        )
    }

    encrypt(data: string): EncryptedPayload {
        return this.encryptionService.encrypt(data, this.derivedKey)
    }

    decrypt(payload: EncryptedPayload): string {
        return this.encryptionService.decrypt(payload, this.derivedKey)
    }
}
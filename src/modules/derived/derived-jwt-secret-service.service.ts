import { Injectable, OnModuleInit } from "@nestjs/common"
import { EncryptionService } from "@modules/crypto"
import { EncryptedPayload } from "@typedefs"
import { GcpKmsService } from "@modules/gcp"
import { MountStorageService } from "@modules/filesystem"
import crypto from "crypto"
import { envConfig } from "@modules/env"

@Injectable()
export class DerivedJwtSecretService implements OnModuleInit {
    public key: Buffer<ArrayBufferLike>
    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async onModuleInit() {
        try {
        // get base key from gcp kms
            const key = await this.gcpKmsService.decrypt(
                this.mountStorageService.encryptedJwtSecret
            )
            // hash base key with salt
            this.key = crypto.pbkdf2Sync(
                key,
                envConfig().salt.jwt,
                100_000,
                32,
                "sha256"
            )
        } catch {
            this.key = crypto.randomBytes(32)
        }
    }

    encrypt(data: string): EncryptedPayload {
        return this.encryptionService.encrypt(data, this.key)
    }

    decrypt(payload: EncryptedPayload): string {
        return this.encryptionService.decrypt(payload, this.key)
    }
}
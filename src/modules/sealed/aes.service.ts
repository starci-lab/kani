import { Injectable, OnModuleInit } from "@nestjs/common"
import { EncryptionService } from "@modules/crypto"
import { EncryptedPayload } from "@typedefs"
import { GcpKmsService } from "@modules/gcp"
import { MountStorageService } from "@modules/filesystem"

@Injectable()
export class SealedAesService implements OnModuleInit {
    public sealedKey: Buffer<ArrayBufferLike>
    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async onModuleInit() {
        this.sealedKey = await this.gcpKmsService.encrypt(this.mountStorageService.aesKey)
    }

    encrypt(data: string): EncryptedPayload {
        return this.encryptionService.encrypt(data, this.sealedKey)
    }

    decrypt(payload: EncryptedPayload): string {
        return this.encryptionService.decrypt(payload, this.sealedKey)
    }
}
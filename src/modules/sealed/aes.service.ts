import { Injectable } from "@nestjs/common"
import { Sealed } from "./sealed.interface"
import { EncryptionService } from "@modules/crypto"
import { EncryptedPayload } from "@typedefs"
import { Cache } from "cache-manager"
import { CacheKey, InjectMemoryCache } from "@modules/cache"
import { envConfig } from "@modules/env"
import { GcpKmsService } from "@modules/gcp"
import { MountStorageService } from "@modules/filesystem"

@Injectable()
export class SealedAesService implements Sealed {
    constructor(
        @InjectMemoryCache()
        private readonly cacheManager: Cache,
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async getSealedKey(): Promise<Buffer<ArrayBufferLike>> {
        const sealedKey = await this.cacheManager.get<string>(CacheKey.SealedAesKey)
        let sealedKeyBuffer: Buffer<ArrayBufferLike>
        if (!sealedKey) {
            sealedKeyBuffer = await this.gcpKmsService.encrypt(this.mountStorageService.aesKey)
            await this.cacheManager.set(CacheKey.SealedAesKey, sealedKeyBuffer.toString("base64"), envConfig().cache.ttl.sealedAesKey)
        } else {
            sealedKeyBuffer = Buffer.from(sealedKey, "base64")
        }
        return sealedKeyBuffer
    }

    async encrypt(data: string): Promise<EncryptedPayload> {
        const sealedKey = await this.getSealedKey()
        return this.encryptionService.encrypt(data, sealedKey)
    }

    async decrypt(payload: EncryptedPayload): Promise<string> {
        const sealedKey = await this.getSealedKey()
        return this.encryptionService.decrypt(payload, sealedKey)
    }
}
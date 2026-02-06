import {
    Injectable,
    OnModuleInit
} from "@nestjs/common"
import crypto from "crypto"
import {
    EncryptionService
} from "@modules/crypto"
import {
    envConfig
} from "@modules/env"
import {
    MountStorageService
} from "@modules/filesystem"
import {
    GcpKmsService
} from "@modules/gcp"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    KEY_LENGTH,
    PBKDF2_DIGEST,
    PBKDF2_ITERATIONS
} from "./constants"
import type {
    DerivedDecryptResult,
    DerivedEncryptResult
} from "./types"
import type {
    EncryptedPayload 
} from "@modules/crypto"

/**
 * Service that derives a JWT secret key from GCP KMS (or fallback random) and exposes encrypt/decrypt.
 *
 * @example
 * await derivedJwtSecretService.encrypt("secret")
 * derivedJwtSecretService.decrypt(payload)
 */
@Injectable()
export class DerivedJwtSecretService implements OnModuleInit {
    public key: Buffer<ArrayBufferLike>

    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly gcpKmsService: GcpKmsService,
        private readonly mountStorageService: MountStorageService,
        private readonly winstonService: WinstonService,
    ) {}

    async onModuleInit(): Promise<void> {
        try {
            const key = await this.gcpKmsService.decrypt(
                this.mountStorageService.encryptedJwtSecretKey
            )
            this.key = crypto.pbkdf2Sync(
                key,
                envConfig().salt.jwt,
                PBKDF2_ITERATIONS,
                KEY_LENGTH,
                PBKDF2_DIGEST
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ErrorDecryptingJwtSecretKey,
                {
                    error: (error as Error).message,
                }
            )
            this.key = crypto.randomBytes(KEY_LENGTH)
        }
    }

    /**
     * Encrypts plaintext using the derived JWT secret key.
     *
     * @param data - Plaintext string
     * @returns Encrypted payload
     *
     * @example
     * const payload = derivedJwtSecretService.encrypt("secret")
     */
    encrypt(data: string): DerivedEncryptResult {
        return this.encryptionService.encrypt({
            plainText: data,
            key: this.key,
        })
    }

    /**
     * Decrypts payload using the derived JWT secret key.
     *
     * @param payload - Encrypted payload
     * @returns Plaintext string
     *
     * @example
     * const text = derivedJwtSecretService.decrypt(payload)
     */
    decrypt(payload: EncryptedPayload): DerivedDecryptResult {
        return this.encryptionService.decrypt({
            payload,
            key: this.key,
        })
    }
}

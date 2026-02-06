import {
    Injectable
} from "@nestjs/common"
import {
    KeyManagementServiceClient
} from "@google-cloud/kms"
import {
    KmsCiphertextNotFoundException,
    KmsDecryptionFailedException,
    KmsEncryptionFailedException,
    KmsEncryptionKeyNotFoundException
} from "@modules/exceptions"
import {
    MountStorageService
} from "@modules/filesystem"
import {
    RetryService
} from "@modules/mixin"
import {
    InjectGcpKmsClient
} from "./gpc.decorators"
import type {
    DecryptParams,
    DecryptResult,
    EncryptParams,
    EncryptResult
} from "./types"

/**
 * Service for KMS encryption and decryption.
 */
@Injectable()
export class GcpKmsService {
    constructor(
        @InjectGcpKmsClient()
        private readonly kmsClient: KeyManagementServiceClient,
        private readonly mountStorageService: MountStorageService,
        private readonly retryService: RetryService
    ) {}

    /**
     * Encrypts plaintext using KMS.
     * @param params - The parameters for the encryption.
     * @returns The encrypted result.
     */
    async encrypt({ plaintext }: EncryptParams): Promise<EncryptResult> {
        try {
            return await this.retryService.retry({
                action: async () => {
                    const rawData = Buffer.from(plaintext,
                        "utf8")
                    const [result] = await this.kmsClient.encrypt({
                        name: this.mountStorageService.appConfig.cryptoKeyName,
                        plaintext: rawData,
                    })
                    if (!result.ciphertext) {
                        throw new KmsEncryptionKeyNotFoundException({
                            kmsKeyName: this.mountStorageService.appConfig.cryptoKeyName,
                        })
                    }
                    return Buffer.from(result.ciphertext)
                }
            })
        } catch (error) {
            throw new KmsEncryptionFailedException({
                originalError: error,
            })
        }
    }

    /**
     * Decrypts ciphertext using KMS.
     * @param params - The parameters for the decryption.
     * @returns The decrypted result.
     */
    async decrypt({ ciphertext }: DecryptParams): Promise<DecryptResult> {
        try {
            return await this.retryService.retry({
                action: async () => {
                    const [result] = await this.kmsClient.decrypt({
                        name: this.mountStorageService.appConfig.cryptoKeyName,
                        ciphertext,
                    })
                    if (!result.plaintext) {
                        throw new KmsCiphertextNotFoundException({
                            kmsKeyName: this.mountStorageService.appConfig.cryptoKeyName,
                        })
                    }
                    return Buffer.from(result.plaintext as Buffer).toString("utf8")
                }
            })
        } catch (error) {
            throw new KmsDecryptionFailedException({
                originalError: error,
            })
        }
    }
}
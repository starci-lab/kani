import {
    Injectable 
} from "@nestjs/common"
import {
    KeyManagementServiceClient 
} from "@google-cloud/kms"
import {
    InjectGcpKmsClient 
} from "./gpc.decorators"
import {
    KmsEncryptionKeyNotFoundException,
    KmsCiphertextNotFoundException,
    KmsDecryptionFailedException,
    KmsEncryptionFailedException
} from "@exceptions"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    RetryService 
} from "@modules/mixin"

@Injectable()
export class GcpKmsService {
    constructor(
    @InjectGcpKmsClient()
    private readonly kmsClient: KeyManagementServiceClient,
    private readonly mountStorageService: MountStorageService,
    private readonly retryService: RetryService
    ) {}

    async encrypt(
        plaintext: string
    ): Promise<Buffer<ArrayBufferLike>> {
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

    async decrypt(
        ciphertext: Buffer<ArrayBufferLike>
    ): Promise<string> {
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
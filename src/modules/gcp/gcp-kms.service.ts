import { Injectable } from "@nestjs/common"
import { KeyManagementServiceClient } from "@google-cloud/kms"
import { InjectGcpKmsClient } from "./gpc.decorators"
import { KmsNotFoundException } from "@exceptions"
import { MountStorageService } from "@modules/filesystem"

@Injectable()
export class GcpKmsService {
    constructor(
    @InjectGcpKmsClient()
    private readonly kmsClient: KeyManagementServiceClient,
    private readonly mountStorageService: MountStorageService,
    ) {}

    async encrypt(
        plaintext: string
    ): Promise<Buffer<ArrayBufferLike>> {
        const rawData = Buffer.from(plaintext, "utf8")
        const [result] = await this.kmsClient.encrypt({
            name: this.mountStorageService.appConfig.cryptoKeyName,
            plaintext: rawData,
        })
        if (!result.ciphertext) {
            throw new KmsNotFoundException("KMS encryption failed: ciphertext is empty")
        }
        return Buffer.from(result.ciphertext)
    }

    async decrypt(
        ciphertext: Buffer<ArrayBufferLike>
    ): Promise<string> {
        const [result] = await this.kmsClient.decrypt({
            name: this.mountStorageService.appConfig.cryptoKeyName,
            ciphertext,
        })
        if (!result.plaintext) {
            throw new KmsNotFoundException("KMS decryption failed: plaintext is empty")
        }
        return Buffer.from(result.plaintext as Buffer).toString("utf8")
    }
}
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
        plaintext: string | Uint8Array
    ): Promise<string> {
        const rawData =
      typeof plaintext === "string"
          ? Buffer.from(plaintext, "utf8")
          : plaintext

        
        const [result] = await this.kmsClient.encrypt({
            name: this.mountStorageService.apiKeys.cryptoKeyName,
            plaintext: rawData,
        })
        if (!result.ciphertext) {
            throw new KmsNotFoundException("KMS encryption failed: ciphertext is empty")
        }
        return Buffer.from(result.ciphertext).toString("base64")
    }

    async decrypt(
        ciphertext: string
    ): Promise<string> {
        const [result] = await this.kmsClient.decrypt({
            name: this.mountStorageService.apiKeys.cryptoKeyName,
            ciphertext: Buffer.from(ciphertext, "base64"),
        })
        if (!result.plaintext) {
            throw new KmsNotFoundException("KMS decryption failed: plaintext is empty")
        }
        return Buffer.from(result.plaintext as Buffer).toString("utf8")
    }
}
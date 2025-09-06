import { Injectable } from "@nestjs/common"
import { KeyManagementServiceClient } from "@google-cloud/kms"
import { envConfig } from "../env/config"
import { InjectGcpKmsClient } from "./gpc.decorators"

@Injectable()
export class GcpKmsService {
    constructor(
    @InjectGcpKmsClient()
    private readonly kmsClient: KeyManagementServiceClient,
    ) {}

    async encrypt(plaintext: string | Uint8Array): Promise<string> {
        const rawData =
      typeof plaintext === "string"
          ? Buffer.from(plaintext, "utf8")
          : plaintext

        const [result] = await this.kmsClient.encrypt({
            name: envConfig().googleCloud.kms.keyName,
            plaintext: rawData,
        })

        if (!result.ciphertext) {
            throw new Error("KMS encryption failed: ciphertext is empty")
        }

        return Buffer.from(result.ciphertext).toString("base64")
    }

    async decrypt(ciphertext: string): Promise<Uint8Array> {
        const [result] = await this.kmsClient.decrypt({
            name: envConfig().googleCloud.kms.keyName,
            ciphertext: Buffer.from(ciphertext, "base64"),
        })

        if (!result.plaintext) {
            throw new Error("KMS decryption failed: plaintext is empty")
        }

        return new Uint8Array(result.plaintext as Buffer)
    }
}
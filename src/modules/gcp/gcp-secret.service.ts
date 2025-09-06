import { Injectable } from "@nestjs/common"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import { InjectGcpSecretClient } from "./gpc.decorators"

@Injectable()
export class GcpSecretService {
    constructor(
        @InjectGcpSecretClient()
        private readonly secretClient: SecretManagerServiceClient) {
    }

    /**
   * Get secret from Google Cloud Secret Manager
   */
    async getSecret(name: string): Promise<string> {
        const [version] = await this.secretClient.accessSecretVersion({
            name, // projects/<project-id>/secrets/<secret-id>/versions/latest
        })

        const payload = version.payload?.data?.toString()
        if (!payload) {
            throw new Error(`Secret ${name} not found or empty`)
        }
        return payload
    }
}
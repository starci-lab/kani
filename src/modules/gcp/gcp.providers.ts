import { Provider } from "@nestjs/common"
import { KeyManagementServiceClient } from "@google-cloud/kms"
import { GCP_KMS_CLIENT, GCP_SECRET_CLIENT } from "./gcp.constants"
import { readFileSync } from "fs"
import { join } from "path"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"

export const createGcpKmsClientProvider = (): Provider => ({
    provide: GCP_KMS_CLIENT,
    useFactory: async (): Promise<KeyManagementServiceClient> => {
        return new KeyManagementServiceClient({
            credentials: JSON.parse(
                readFileSync(
                    join(process.cwd(), ".gcp", "encryption-sa.json"),
                    "utf8",
                ),
            ),
        })
    },
})

export const createGcpSecretClientProvider = (): Provider => ({
    provide: GCP_SECRET_CLIENT,
    useFactory: async (): Promise<SecretManagerServiceClient> => {
        return new SecretManagerServiceClient({
            credentials: JSON.parse(
                readFileSync(
                    join(process.cwd(), ".gcp", "encryption-sa.json"),
                    "utf8",
                ),
            ),
        })
    },
})

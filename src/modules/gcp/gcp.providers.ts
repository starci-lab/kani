import { Provider } from "@nestjs/common"
import { KeyManagementServiceClient } from "@google-cloud/kms"
import { GCP_KMS_CLIENT, GCP_SECRET_CLIENT } from "./gcp.constants"
import { readFileSync } from "fs"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import { envConfig } from "@modules/env"

export const createGcpKmsClientProvider = (): Provider => ({
    provide: GCP_KMS_CLIENT,
    useFactory: async (): Promise<KeyManagementServiceClient> => {
        return new KeyManagementServiceClient({
            credentials: JSON.parse(
                readFileSync(
                    envConfig().mountPath.gcp.encryptionSa,
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
                    envConfig().mountPath.gcp.encryptionSa,
                    "utf8",
                ),
            ),
        })
    },
})

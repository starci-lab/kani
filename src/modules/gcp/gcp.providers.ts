import {
    Provider 
} from "@nestjs/common"
import {
    KeyManagementServiceClient 
} from "@google-cloud/kms"
import {
    GCP_KMS_CLIENT 
} from "./gcp.constants"
import {
    MountFilesystemService 
} from "@modules/filesystem"

export const createGcpKmsClientProvider = (): Provider => ({
    provide: GCP_KMS_CLIENT,
    inject: [MountFilesystemService],
    useFactory: async (
        mountFilesystemService: MountFilesystemService
    ): Promise<KeyManagementServiceClient> => {
        return new KeyManagementServiceClient({
            credentials: JSON.parse(
                mountFilesystemService.gcpCryptoKeyEdSa(),
            ),
        })
    },
})
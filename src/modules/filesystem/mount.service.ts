import { Injectable } from "@nestjs/common"
import { AppConfig, RpcAccessConfigs } from "./types"
import {  
    getCryptoKeyEdSa,  
    getRpcAccessConfigs, 
    getEncryptedJwtSecretKey,
    getEncryptedAesKey,
    getAppConfig,
    getCloudKmsCryptoOperatorSa,
    getGoogleDriveUdSa
} from "./pure"
/**
 * Service responsible for reading secrets mounted into the container filesystem.
 *
 * Purpose:
 * - Avoid using process.env for sensitive secrets (prevents leaks via logs, APMs, or third-party libraries)
 * - Secrets are mounted as Kubernetes Secret volumes
 * - Secrets are accessed explicitly and on demand via the filesystem
 *
 * This follows best practices for Node.js applications running on Kubernetes.
 */
@Injectable()
export class MountFilesystemService {
    appConfig(): AppConfig {
        return getAppConfig()
    }

    encryptedJwtSecretKey(): Buffer {
        return getEncryptedJwtSecretKey()
    }

    encryptedAesKey(): Buffer {
        return getEncryptedAesKey()
    }

    cryptoKeyEdSa(): string {
        return getCryptoKeyEdSa()
    }

    cloudKmsCryptoOperatorSa(): string {
        return getCloudKmsCryptoOperatorSa()
    }

    googleDriveUdSa(): string {
        return getGoogleDriveUdSa()
    }

    rpcAccessConfigs(): RpcAccessConfigs {
        return getRpcAccessConfigs()
    }
}

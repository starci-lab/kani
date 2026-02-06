import {
    Injectable 
} from "@nestjs/common"
import {
    AppConfig, RpcAccessConfigs
} from "./types"
import {
    getAppConfig,
    getCoinMarketCapApiKey,
    getEncryptedAesKey,
    getEncryptedJwtSecretKey,
    getGcpCloudKmsCryptoOperatorSa,
    getGcpCryptoKeyEdSa,
    getGcpGoogleDriveUdSa,
    getPrivyAppSecretKey,
    getPrivySignerPrivateKey,
    getRpcAccessConfigs,
} from "./utils"
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

    gcpCryptoKeyEdSa(): string {
        return getGcpCryptoKeyEdSa()
    }

    gcpCloudKmsCryptoOperatorSa(): string {
        return getGcpCloudKmsCryptoOperatorSa()
    }

    gcpGoogleDriveUdSa(): string {
        return getGcpGoogleDriveUdSa()
    }

    rpcAccessConfigs(): RpcAccessConfigs {
        return getRpcAccessConfigs()
    }

    privySignerPrivateKey(): string {
        return getPrivySignerPrivateKey()
    }

    privyAppSecretKey(): string {
        return getPrivyAppSecretKey()
    }

    coinMarketCapApiKey(): string {
        return getCoinMarketCapApiKey()
    }
}

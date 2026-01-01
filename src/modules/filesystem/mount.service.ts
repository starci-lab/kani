import { Injectable } from "@nestjs/common"
import { ApiKeys, RpcAccessConfigs, SmtpConfig } from "./types"
import {  
    getApiKeys, 
    getCryptoKeyEdSa,  
    getCloudKmsCryptoOperatorSa, 
    getRpcAccessConfigs, 
    getSmtpConfig, 
    getJwtSecretKey,
    getEncryptedAesKey
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
    smtpConfig(): SmtpConfig {
        return getSmtpConfig()
    }

    jwtSecretKey(): Buffer {
        return getJwtSecretKey()
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

    rpcAccessConfigs(): RpcAccessConfigs {
        return getRpcAccessConfigs()
    }

    apiKeys(): ApiKeys {
        return getApiKeys()
    }
}

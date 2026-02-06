import {
    readFileSync
} from "fs"
import {
    envConfig
} from "@modules/env"
import type {
    AppConfig,
    RpcAccessConfigs
} from "../types"

/**
 * Get GCP crypto key ED SA content (from mount path or provided value).
 */
export const getGcpCryptoKeyEdSa = (gcpCryptoKeyEdSa?: string): string => {
    if (!gcpCryptoKeyEdSa) {
        gcpCryptoKeyEdSa = readFileSync(
            envConfig().mountPath.terraform.gcpCryptoKeyEdSa,
            "utf8",
        )
    }
    return gcpCryptoKeyEdSa
}

/**
 * Get RPC access configs (from mount path or provided value).
 */
export const getRpcAccessConfigs = (rpcAccessConfigs?: RpcAccessConfigs): RpcAccessConfigs => {
    if (!rpcAccessConfigs) {
        rpcAccessConfigs = JSON.parse(
            readFileSync(envConfig().mountPath.config.rpcs,
                "utf8"),
        ) as RpcAccessConfigs
    }
    return rpcAccessConfigs
}

/**
 * Get app config (from mount path or provided value).
 */
export const getAppConfig = (appConfig?: AppConfig): AppConfig => {
    if (!appConfig) {
        appConfig = JSON.parse(
            readFileSync(envConfig().mountPath.config.app,
                "utf8"),
        ) as AppConfig
    }
    return appConfig
}

/**
 * Get encrypted AES key from mount path (returns Buffer).
 */
export const getEncryptedAesKey = (encryptedAesKey?: Buffer): Buffer => {
    const encryptedAesKeyBuffer = readFileSync(
        envConfig().mountPath.terraform.encryptedAesKey,
        "utf8",
    )
    if (!encryptedAesKey) {
        encryptedAesKey = Buffer.from(encryptedAesKeyBuffer,
            "base64")
    }
    return encryptedAesKey
}

/**
 * Get encrypted JWT secret key from mount path (returns Buffer).
 */
export const getEncryptedJwtSecretKey = (encryptedJwtSecretKey?: Buffer): Buffer => {
    const encryptedJwtSecretKeyBuffer = readFileSync(
        envConfig().mountPath.terraform.encryptedJwtSecretKey,
        "utf8",
    )
    if (!encryptedJwtSecretKey) {
        encryptedJwtSecretKey = Buffer.from(encryptedJwtSecretKeyBuffer,
            "base64")
    }
    return encryptedJwtSecretKey
}

/**
 * Get GCP Cloud KMS crypto operator SA content from mount path.
 */
export const getGcpCloudKmsCryptoOperatorSa = (
    gcpCloudKmsCryptoOperatorSa?: string,
): string => {
    if (!gcpCloudKmsCryptoOperatorSa) {
        gcpCloudKmsCryptoOperatorSa = readFileSync(
            envConfig().mountPath.terraform.gcpCloudKmsCryptoOperatorSa,
            "utf8",
        )
    }
    return gcpCloudKmsCryptoOperatorSa
}

/**
 * Get Google Drive UD SA content from mount path.
 */
export const getGcpGoogleDriveUdSa = (gcpGoogleDriveUdSa?: string): string => {
    if (!gcpGoogleDriveUdSa) {
        gcpGoogleDriveUdSa = readFileSync(
            envConfig().mountPath.terraform.gcpGoogleDriveUdSa,
            "utf8",
        )
    }
    return gcpGoogleDriveUdSa
}

/**
 * Get Privy app secret key from mount path.
 */
export const getPrivyAppSecretKey = (privyAppSecretKey?: string): string => {
    if (!privyAppSecretKey) {
        privyAppSecretKey = readFileSync(
            envConfig().mountPath.terraform.privyAppSecretKey,
            "utf8",
        )
    }
    return privyAppSecretKey
}

/**
 * Get Privy signer private key from mount path.
 */
export const getPrivySignerPrivateKey = (privySignerPrivateKey?: string): string => {
    if (!privySignerPrivateKey) {
        privySignerPrivateKey = readFileSync(
            envConfig().mountPath.terraform.privySignerPrivateKey,
            "utf8",
        )
    }
    return privySignerPrivateKey
}

/**
 * Get CoinMarketCap API key from mount path.
 */
export const getCoinMarketCapApiKey = (coinMarketCapApiKey?: string): string => {
    if (!coinMarketCapApiKey) {
        coinMarketCapApiKey = readFileSync(
            envConfig().mountPath.terraform.coinMarketCapApiKey,
            "utf8",
        )
    }
    return coinMarketCapApiKey
}

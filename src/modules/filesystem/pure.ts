import {
    envConfig 
} from "@modules/env"
import {
    readFileSync 
} from "fs"
import {
    AppConfig, RpcAccessConfigs 
} from "./types"

/**
 * Pure function to get the crypto key ed sa
 * in case there is component that not depends on nestjs DI
 */
export const getGcpCryptoKeyEdSa = (
    gcpCryptoKeyEdSa?: string
) => {
    if (!gcpCryptoKeyEdSa) {
        gcpCryptoKeyEdSa = readFileSync(
            envConfig().mountPath.terraform.gcpCryptoKeyEdSa,
            "utf8"
        )
    }
    return gcpCryptoKeyEdSa
}

/**
 * Pure function to get the rpc config
 * in case there is component that not depends on nestjs DI
 */
export const getRpcAccessConfigs = (
    rpcAccessConfigs?: RpcAccessConfigs
) => {
    if (!rpcAccessConfigs) {
        rpcAccessConfigs = JSON.parse(
            readFileSync(
                envConfig().mountPath.config.rpcs,
                "utf8"
            )) as RpcAccessConfigs
    }
    return rpcAccessConfigs
}   

/**
 * Pure function to get the app config
 * in case there is component that not depends on nestjs DI
 */
export const getAppConfig = (
    appConfig?: AppConfig
) => {
    if (!appConfig) {
        appConfig = JSON.parse(
            readFileSync(
                envConfig().mountPath.config.app,
                "utf8"
            )) as AppConfig
    }
    return appConfig
}   

/**
 * Pure function to get the encrypted aes key
 * in case there is component that not depends on nestjs DI
 */
export const getEncryptedAesKey = (
    encryptedAesKey?: Buffer
) => {
    const encryptedAesKeyBuffer = readFileSync(
        envConfig().mountPath.terraform.encryptedAesKey,
        "utf8"
    )
    if (!encryptedAesKey) {
        encryptedAesKey = Buffer.from(
            encryptedAesKeyBuffer,
            "base64"
        )
    }
    return encryptedAesKey
}   

/**
 * Pure function to get the encrypted jwt secret key
 * in case there is component that not depends on nestjs DI
 */
export const getEncryptedJwtSecretKey = (
    encryptedJwtSecretKey?: Buffer
) => {
    const encryptedJwtSecretKeyBuffer = readFileSync(
        envConfig().mountPath.terraform.encryptedJwtSecretKey,
        "utf8"
    )
    if (!encryptedJwtSecretKey) {
        encryptedJwtSecretKey = Buffer.from(
            encryptedJwtSecretKeyBuffer, 
            "base64"
        )
    }
    return encryptedJwtSecretKey
}

/**
 * Pure function to get the crypto key ed sa
 * in case there is component that not depends on nestjs DI
 */
export const getGcpCloudKmsCryptoOperatorSa = (
    gcpCloudKmsCryptoOperatorSa?: string
) => {
    if (!gcpCloudKmsCryptoOperatorSa) {
        gcpCloudKmsCryptoOperatorSa = readFileSync(
            envConfig().mountPath.terraform.gcpCloudKmsCryptoOperatorSa,
            "utf8"
        )
    }
    return gcpCloudKmsCryptoOperatorSa
}

/**
 * Pure function to get the google drive ud sa
 * in case there is component that not depends on nestjs DI
 */
export const getGcpGoogleDriveUdSa = (
    gcpGoogleDriveUdSa?: string
) => {
    if (!gcpGoogleDriveUdSa) {
        gcpGoogleDriveUdSa = readFileSync(
            envConfig().mountPath.terraform.gcpGoogleDriveUdSa,
            "utf8"
        )
    }
    return gcpGoogleDriveUdSa
}

/**
 * Pure function to get the privy app secret
 * in case there is component that not depends on nestjs DI
 */
export const getPrivyAppSecretKey = (
    privyAppSecretKey?: string
) => {
    if (!privyAppSecretKey) {
        privyAppSecretKey = readFileSync(
            envConfig().mountPath.terraform.privyAppSecretKey,
            "utf8"
        )
    }
    return privyAppSecretKey
}

/**
 * Pure function to get the privy signer public key
 * in case there is component that not depends on nestjs DI
 */
export const getPrivySignerPrivateKey = (
    privySignerPrivateKey?: string
) => {
    if (!privySignerPrivateKey) {
        privySignerPrivateKey = readFileSync(
            envConfig().mountPath.terraform.privySignerPrivateKey,
            "utf8"
        )
    }
    return privySignerPrivateKey
}

/**
 * Pure function to get the coinmarketcap api key
 * in case there is component that not depends on nestjs DI
 */
export const getCoinMarketCapApiKey = (
    coinMarketCapApiKey?: string
) => {
    if (!coinMarketCapApiKey) {
        coinMarketCapApiKey = readFileSync(
            envConfig().mountPath.terraform.coinMarketCapApiKey,
            "utf8"
        )
    }
    return coinMarketCapApiKey
}
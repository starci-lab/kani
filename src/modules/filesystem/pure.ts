import { envConfig } from "@modules/env"
import { readFileSync } from "fs"
import { AppConfig, RpcAccessConfigs } from "./types"


/**
 * Pure function to get the crypto key ed sa
 * in case there is component that not depends on nestjs DI
 */
export const getCryptoKeyEdSa = (cryptoKeyEdSa?: string) => {
    if (!cryptoKeyEdSa) {
        cryptoKeyEdSa = readFileSync(
            envConfig().mountPath.terraform.cryptoKeyEdSa,
            "utf8"
        )
    }
    return cryptoKeyEdSa
}

/**
 * Pure function to get the rpc config
 * in case there is component that not depends on nestjs DI
 */
export const getRpcAccessConfigs = (rpcAccessConfigs?: RpcAccessConfigs) => {
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
export const getAppConfig = (appConfig?: AppConfig) => {
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
export const getEncryptedAesKey = (encryptedAesKey?: Buffer) => {
    if (!encryptedAesKey) {
        encryptedAesKey = Buffer.from(
            readFileSync(envConfig().mountPath.terraform.encryptedAesKey, "utf8")) as Buffer
    }
    return encryptedAesKey
}   

/**
 * Pure function to get the encrypted jwt secret key
 * in case there is component that not depends on nestjs DI
 */
export const getEncryptedJwtSecretKey = (encryptedJwtSecretKey?: Buffer) => {
    if (!encryptedJwtSecretKey) {
        encryptedJwtSecretKey = Buffer.from(
            readFileSync(envConfig().mountPath.terraform.encryptedJwtSecretKey, "utf8")) as Buffer
    }
    return encryptedJwtSecretKey
}

/**
 * Pure function to get the crypto key ed sa
 * in case there is component that not depends on nestjs DI
 */
export const getCloudKmsCryptoOperatorSa = (cloudKmsCryptoOperatorSa?: string) => {
    if (!cloudKmsCryptoOperatorSa) {
        cloudKmsCryptoOperatorSa = readFileSync(
            envConfig().mountPath.terraform.cloudKmsCryptoOperatorSa,
            "utf8"
        )
    }
    return cloudKmsCryptoOperatorSa
}

/**
 * Pure function to get the google drive ud sa
 * in case there is component that not depends on nestjs DI
 */
export const getGoogleDriveUdSa = (googleDriveUdSa?: string) => {
    if (!googleDriveUdSa) {
        googleDriveUdSa = readFileSync(
            envConfig().mountPath.terraform.googleDriveUdSa,
            "utf8"
        )
    }
    return googleDriveUdSa
}
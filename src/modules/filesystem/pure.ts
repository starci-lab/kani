import { envConfig } from "@modules/env"
import { readFileSync } from "fs"
import { ApiKeys, Keys, RpcAccessConfigs, SmtpConfig } from "./types"
import crypto from "crypto"
/**
 * Pure function to get the smtp config
 * in case there is component that not depends on nestjs DI
 */
export const getSmtpConfig = (smtpConfig?: SmtpConfig) => {
    if (!smtpConfig) {
        const smtpConfigPlainText = readFileSync(
            envConfig().mountPath.config.smtp,
            "utf8"
        )
        return JSON.parse(smtpConfigPlainText) as SmtpConfig
    }
    return smtpConfig
}

/**
 * Pure function to get the crypto key ed sa
 * in case there is component that not depends on nestjs DI
 */
export const getCryptoKeyEdSa = (cryptoKeyEdSa?: string) => {
    if (!cryptoKeyEdSa) {
        cryptoKeyEdSa = readFileSync(
            envConfig().mountPath.gcp.cryptoKeyEdSa,
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
 * Pure function to get the api keys
 * in case there is component that not depends on nestjs DI
 */
export const getApiKeys = (apiKeys?: ApiKeys) => {
    if (!apiKeys) {
        apiKeys = JSON.parse(
            readFileSync(
                envConfig().mountPath.config.apiKeys,
                "utf8"
            )) as ApiKeys
    }
    return apiKeys
}

/**
 * Pure function to get the kms admin sa
 * in case there is component that not depends on nestjs DI
 */
export const getCloudKmsCryptoOperatorSa = (cloudKmsCryptoOperatorSa?: string) => {
    if (!cloudKmsCryptoOperatorSa) {
        cloudKmsCryptoOperatorSa = readFileSync(
            envConfig().mountPath.gcp.cloudKmsCryptoOperatorSa,
            "utf8"
        )
    }
    return cloudKmsCryptoOperatorSa
}

/**
 * Pure function to get the keys
 * in case there is component that not depends on nestjs DI
 */
export const getKeys = (keys?: Keys) => {
    if (!keys) {
        keys = JSON.parse(
            readFileSync(envConfig().mountPath.config.keys, "utf8")) as Keys
    }
    return keys
}

/**
 * Pure function to get the jwt secret key
 * in case there is component that not depends on nestjs DI
 */
export const getJwtSecretKey = (jwtSecretKey?: Buffer) => {
    if (!jwtSecretKey) {
        jwtSecretKey = crypto.pbkdf2Sync(
            getKeys().jwtSecret,
            envConfig().salt.jwt,
            100_000,
            32,
            "sha256"
        )
    }
    return jwtSecretKey
}

/**
 * Pure function to get the encrypted aes key
 * in case there is component that not depends on nestjs DI
 */
export const getEncryptedAesKey = (encryptedAesKey?: Buffer) => {
    if (!encryptedAesKey) {
        encryptedAesKey = Buffer.from(getKeys().encryptedAesKey, "base64")
    }
    return encryptedAesKey
}

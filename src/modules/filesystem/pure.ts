import { envConfig } from "@modules/env"
import crypto from "crypto"
import { readFileSync } from "fs"
import { ApiKeys, RpcAccessConfigs, SmtpConfig } from "./types"

// pure function to get the jwt secret key
// in case there is component that not depends on nestjs DI
export const getJwtSecretKey = (jwtSecret?: string) => {
    if (!jwtSecret) {
        jwtSecret = readFileSync(
            envConfig().mountPath.keys.jwtSecret,
            "utf8"
        )
    }
    const keyBuffer = crypto.pbkdf2Sync(
        jwtSecret,                 // base key
        envConfig().salt.jwt,   // salt
        100_000,                // number of hash rounds
        32,                     // length of key (bytes)
        "sha256"                // hash function
    )
    return keyBuffer.toString("hex")
}
/**
 * Pure function to get the aes key
 * in case there is component that not depends on nestjs DI
 */
export const getAesKey = (aes?: string) => {
    if (!aes) {
        aes = readFileSync(
            envConfig().mountPath.keys.aes,
            "utf8"
        )
    }
    const keyBuffer = crypto.pbkdf2Sync(
        aes,                 // base key
        envConfig().salt.aesCbc,   // salt
        100_000,                // number of hash rounds
        32,                     // length of key (bytes)
        "sha256"                // hash function
    )
    return keyBuffer.toString("hex")
}

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
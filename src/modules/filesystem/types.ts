import { ChainId } from "@typedefs"

export interface AppSecrets {
    smtp: SmtpConfig
    keys: SecurityKeys
}

export interface SmtpConfig {
    host: string
    port: number
    user: string
    key: string
    from: string
}

export interface SecurityKeys {
    aes: string
    "jwt-secret": string
    gcp: GcpConfig
}

export interface GcpConfig {
    kms: KmsConfig
}

export interface KmsConfig {
    keyName: string
}

export interface SmtpConfig {
    host: string
    port: number
    user: string
    password: string
    secure: boolean
    from: string
}

export enum RpcAccessType {
    Read = "read",
    Write = "write",
}

export interface RpcAccessConfig {
    // id of the rpc
    id: string
    // The url of the rpc
    url: string
    // The weight of the rpc, 
    // the higher the weight, the more likely 
    // the rpc will be used
    weight: number
    // Whether the rpc supports ws
    supportWs: boolean
    // The access types of the rpc
    accessTypes: Array<RpcAccessType>
}

// Simplified client config schema, only contains the rpc access configs for each chain
export interface RpcAccessConfigs {
    [ChainId.Solana]: Array<RpcAccessConfig>
    [ChainId.Sui]: Array<RpcAccessConfig>
}
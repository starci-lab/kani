import {
    ChainId
} from "@modules/common"

/** How the RPC can be accessed (http, ws, write). */
export enum RpcAccessType {
    Http = "http",
    Ws = "ws",
    Write = "write",
}

/** Single RPC access entry (id, url, weight, access type). */
export interface RpcAccessConfig {
    id: string
    url: string
    weight: number
    accessType: RpcAccessType
}

/** RPC access configs per chain. */
export interface RpcAccessConfigs {
    [ChainId.Solana]: Array<RpcAccessConfig>
    [ChainId.Sui]: Array<RpcAccessConfig>
}

/** SMTP configuration. */
export interface SmtpConfig {
    host: string
    port: number
    user: string
    password: string
    from: string
    secure: boolean
}

/** GCP project config. */
export interface GcpConfig {
    projectId: string
    location: string
}

/** Google Drive folder IDs (db, keys). */
export interface DriveConfig {
    folderIds: {
        db: string
        keys: string
    }
}

/** Open position fee config. */
export interface OpenPositionFeeConfig {
    feeToAddress: string
    feeRate: number
}

/** Swap referral fee config. */
export interface SwapReferralFeeConfig {
    feeToAddress: string
    referralTokenAccountAddress: string
    bps: number
}

/** Privy config (app id and signer). */
export interface PrivyConfig {
    appId: string
    signer: {
        id: string
        publicKey: string
    }
}

/** Fees config per chain (open position, swap referral). */
export interface FeesConfig {
    openPosition: {
        solana: OpenPositionFeeConfig
        sui: OpenPositionFeeConfig
    }
    swapReferral: {
        solana: SwapReferralFeeConfig
        sui: SwapReferralFeeConfig
    }
}

/** Root app config (API keys, GCP, drive, privy, smtp, fees). */
export interface AppConfig {
    jupiter: string
    sentryDsn: string
    cryptoKeyName: string
    gcp: GcpConfig
    drive: DriveConfig
    privy: PrivyConfig
    smtp: SmtpConfig
    fees: FeesConfig
}

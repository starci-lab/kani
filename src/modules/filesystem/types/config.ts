import {
    ChainId
} from "@modules/common"
import {
    RangeTier 
} from "@modules/databases"

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
    /** ROI fee rate (0..1) applied to target token balance for transfer fees. */
    feeRate?: number
    openPosition: {
        solana: OpenPositionFeeConfig
        sui: OpenPositionFeeConfig
    }
    swapReferral: {
        solana: SwapReferralFeeConfig
        sui: SwapReferralFeeConfig
    }
}

/** Gas amount requirements per chain. */
export interface GasAmountRequired {
    minOperationalAmount: number
    targetOperationalAmount: number
    swapAmount: number
}

/** Gas config per chain. */
export interface GasConfig {
    gasAmountRequired: Partial<Record<ChainId, GasAmountRequired>>
}

/** Balance requirements per chain. */
export interface BalanceRequired {
    minRequiredAmountInUsd: number
}

/** Balance config per chain. */
export interface BalanceConfig {
    balanceRequired: Partial<Record<ChainId, BalanceRequired>>
}

/** Account limits config. */
export interface AccountLimitsConfig {
    maxBotsPerAccount: number
}

/** Avatars config. */
export interface AvatarsConfig {
    avatarUrls: Array<string>
}

/** Authentication config. */
export interface AuthenticationConfig {
    authenticationFactors: Array<string>
}

/** Range tier entry. */
export interface RangeTierEntry {
    tier: RangeTier
    ticks: number
    binStep: number
}

/** Range tiers config. */
export type RangeTiersConfig = Array<RangeTierEntry>

/** Root app config (API keys, GCP, drive, privy, smtp, fees, static config). */
export interface AppConfig {
    jupiter: string
    sentryDsn: string
    cryptoKeyName: string
    gcp: GcpConfig
    drive: DriveConfig
    privy: PrivyConfig
    smtp: SmtpConfig
    fees: FeesConfig
    gas: GasConfig
    balance: BalanceConfig
    accountLimits: AccountLimitsConfig
    avatars: AvatarsConfig
    authentication: AuthenticationConfig
    rangeTiers: RangeTiersConfig
}

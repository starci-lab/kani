import type { ChainId } from "@modules/common"
import type { AuthenticationFactor } from "../enums"

/** Gas config per chain. */
export interface GasConfig {
    gasAmountRequired: Partial<Record<ChainId, GasAmountRequired>>
}

/** Gas amount requirements per chain. */
export interface GasAmountRequired {
    /** Minimum gas required for the bot to operate at all */
    minOperationalAmount: number
    /** Target gas amount for stable and uninterrupted operation */
    targetOperationalAmount: number
    /** Gas amount to swap when the swap is triggered */
    swapAmount: number
}

/** Generic config record wrapper. */
export interface ConfigRecord<T> {
    value: T
}

/** Balance requirements. */
export interface BalanceRequired {
    minRequiredAmountInUsd: number
}

/** Balance config per chain. */
export interface BalanceConfig {
    balanceRequired: Partial<Record<ChainId, BalanceRequired>>
}

/** Profit/account limits config. */
export interface ProfitConfig {
    accountLimits: Partial<Record<ChainId, AccountLimitsConfig>>
}

/** Account limits per chain. */
export interface AccountLimitsConfig {
    maxBotsPerAccount: number
}

/** Avatars config. */
export interface AvatarsConfig {
    avatarUrls: Array<string>
}

/** Authentication config. */
export interface AuthenticationConfig {
    authenticationFactors: Array<AuthenticationFactor>
}

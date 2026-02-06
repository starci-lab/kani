import {
    bignum
} from "@metaplex-foundation/beet"

/**
 * Remaining accounts info type for Meteora transactions.
 */
export interface RemainingAccountsInfoType {
    /** Array of slice indices. */
    slices: Array<number>
}

/**
 * Arguments for removing liquidity by range.
 */
export interface RemoveLiquidityByRange2ArgsType {
    /** From bin ID. */
    fromBinId: number
    /** To bin ID. */
    toBinId: number
    /** BPS to remove. */
    bpsToRemove: number
    /** Remaining accounts info. */
    remainingAccountsInfo: RemainingAccountsInfoType
}

/**
 * Arguments for claiming fees.
 */
export interface ClaimFee2ArgsType {
    /** Minimum bin ID. */
    minBinId: number
    /** Maximum bin ID. */
    maxBinId: number
    /** Remaining accounts info. */
    remainingAccountsInfo: RemainingAccountsInfoType
}

/**
 * Arguments for claiming rewards.
 */
export interface ClaimReward2ArgsType {
    /** Reward index. */
    rewardIndex: bignum
    /** Minimum bin ID. */
    minBinId: number
    /** Maximum bin ID. */
    maxBinId: number
    /** Remaining accounts info. */
    remainingAccountsInfo: RemainingAccountsInfoType
}

import BN from "bn.js"
import {
    PublicKey
} from "@solana/web3.js"

/**
 * Reward information in Raydium observer.
 */
export interface RaydiumRewardInfo {
    /** Reward state. */
    rewardState: number
    /** Reward claimed. */
    rewardClaimed: BN
    /** Creator public key. */
    creator: PublicKey
    /** End time. */
    endTime: BN
    /** Open time. */
    openTime: BN
    /** Last update time. */
    lastUpdateTime: BN
    /** Emissions per second X64. */
    emissionsPerSecondX64: BN
    /** Reward total emissioned. */
    rewardTotalEmissioned: BN
    /** Token mint public key. */
    tokenMint: PublicKey
    /** Token vault public key. */
    tokenVault: PublicKey
    /** Reward growth global X64. */
    rewardGrowthGlobalX64: BN
}

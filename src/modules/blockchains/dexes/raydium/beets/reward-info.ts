import {
    BeetStruct, bignum, u8, u64, u128 
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"

/**
 * Reward information for a Raydium pool.
 * Represents reward token configuration and state.
 */
export class RewardInfo {
    constructor(
        /** Reward state (u8). */
        readonly rewardState: number,
        /** Open time (u64). */
        readonly openTime: bignum,
        /** End time (u64). */
        readonly endTime: bignum,
        /** Last update time (u64). */
        readonly lastUpdateTime: bignum,
        /** Emissions per second in Q64.64 format (u128). */
        readonly emissionsPerSecondX64: bignum,
        /** Total reward emissioned (u64). */
        readonly rewardTotalEmissioned: bignum,
        /** Reward claimed (u64). */
        readonly rewardClaimed: bignum,
        /** Public key of the reward token mint. */
        readonly tokenMint: PublicKey,
        /** Public key of the reward token vault. */
        readonly tokenVault: PublicKey,
        /** Authority (u128). */
        readonly authority: bignum,
        /** Reward growth global in Q64.64 format (u128). */
        readonly rewardGrowthGlobalX64: bignum,
    ) {}
  
    static readonly struct = new BeetStruct<RewardInfo>(
        [
            ["rewardState",
                u8],
            ["openTime",
                u64],
            ["endTime",
                u64],
            ["lastUpdateTime",
                u64],
            ["emissionsPerSecondX64",
                u128],
            ["rewardTotalEmissioned",
                u64],
            ["rewardClaimed",
                u64],
            ["tokenMint",
                publicKey],
            ["tokenVault",
                publicKey],
            ["authority",
                u128],
            ["rewardGrowthGlobalX64",
                u128],
        ],
        (args) =>
            new RewardInfo(
          args.rewardState!,
          args.openTime!,
          args.endTime!,
          args.lastUpdateTime!,
          args.emissionsPerSecondX64!,
          args.rewardTotalEmissioned!,
          args.rewardClaimed!,
          args.tokenMint!,
          args.tokenVault!,
          args.authority!,
          args.rewardGrowthGlobalX64!,
            ),
        "RewardInfo",
    )
}
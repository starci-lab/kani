import {
    BeetStruct,
    u64,
    u128,
    bignum,
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"
  
/**
 * Reward information for Meteora DLMM liquidity pool.
 * Represents reward token configuration and state.
 */
export class RewardInfo {
    constructor(
      /** Public key of the reward token mint. */
      readonly mint: PublicKey,
      /** Public key of the reward vault. */
      readonly vault: PublicKey,
      /** Public key of the reward funder. */
      readonly funder: PublicKey,
      /** Duration of the reward period. */
      readonly reward_duration: bignum,
      /** End timestamp of the reward period. */
      readonly reward_duration_end: bignum,
      /** Rate at which rewards are distributed. */
      readonly reward_rate: bignum,
      /** Timestamp of last reward update. */
      readonly last_update_time: bignum,
      /** Cumulative seconds with empty liquidity during reward period. */
      readonly cumulative_seconds_with_empty_liquidity_reward: bignum,
    ) {}
  
    static readonly struct = new BeetStruct<RewardInfo>(
        [
            ["mint",
                publicKey],
            ["vault",
                publicKey],
            ["funder",
                publicKey],
            ["reward_duration",
                u64],
            ["reward_duration_end",
                u64],
            ["reward_rate",
                u128],
            ["last_update_time",
                u64],
            ["cumulative_seconds_with_empty_liquidity_reward",
                u64],
        ],
        (args) =>
            new RewardInfo(
          args.mint!,
          args.vault!,
          args.funder!,
          args.reward_duration!,
          args.reward_duration_end!,
          args.reward_rate!,
          args.last_update_time!,
          args.cumulative_seconds_with_empty_liquidity_reward!,
            ),
        "RewardInfo"
    )
}
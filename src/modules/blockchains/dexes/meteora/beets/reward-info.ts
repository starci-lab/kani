import {
    BeetStruct,
    u64,
    u128,
    bignum,
} from "@metaplex-foundation/beet"
import { publicKey } from "@metaplex-foundation/beet-solana"
import { PublicKey } from "@solana/web3.js"
  
// ==================== RewardInfo ====================
export class RewardInfo {
    constructor(
      readonly mint: PublicKey,
      readonly vault: PublicKey,
      readonly funder: PublicKey,
      readonly reward_duration: bignum,
      readonly reward_duration_end: bignum,
      readonly reward_rate: bignum,
      readonly last_update_time: bignum,
      readonly cumulative_seconds_with_empty_liquidity_reward: bignum,
    ) {}
  
    static readonly struct = new BeetStruct<RewardInfo>(
        [
            ["mint", publicKey],
            ["vault", publicKey],
            ["funder", publicKey],
            ["reward_duration", u64],
            ["reward_duration_end", u64],
            ["reward_rate", u128],
            ["last_update_time", u64],
            ["cumulative_seconds_with_empty_liquidity_reward", u64],
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
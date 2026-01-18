import {
    BeetStruct, bignum, u8, u64, u128 
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"

export class RewardInfo {
    constructor(
        readonly rewardState: number,
        readonly openTime: bignum,
        readonly endTime: bignum,
        readonly lastUpdateTime: bignum,
        readonly emissionsPerSecondX64: bignum,
        readonly rewardTotalEmissioned: bignum,
        readonly rewardClaimed: bignum,
        readonly tokenMint: PublicKey,
        readonly tokenVault: PublicKey,
        readonly authority: bignum,
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
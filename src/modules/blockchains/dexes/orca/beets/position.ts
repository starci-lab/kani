import { BeetStruct, bignum, i32, u128, u64, uniformFixedSizeArray } from "@metaplex-foundation/beet"
import { publicKey } from "@metaplex-foundation/beet-solana"
import { PublicKey } from "@solana/web3.js"
import { PositionRewardInfo } from "./position-reward-info"

export class Position {
    constructor(
        readonly whirlpool: PublicKey,
        readonly positionMint: PublicKey,
        readonly liquidity: bignum,
        readonly tickLowerIndex: number,
        readonly tickUpperIndex: number,
        readonly feeGrowthCheckpointA: bignum,
        readonly feeOwedA: bignum,
        readonly feeGrowthCheckpointB: bignum,
        readonly feeOwedB: bignum,
        readonly rewardInfos: Array<PositionRewardInfo>,
    ) {}

    static readonly struct = new BeetStruct<Position>(
        [
            ["whirlpool", publicKey],
            ["positionMint", publicKey],
            ["liquidity", u128],
            ["tickLowerIndex", i32],
            ["tickUpperIndex", i32],
            ["feeGrowthCheckpointA", u128],
            ["feeOwedA", u64],
            ["feeGrowthCheckpointB", u128],
            ["feeOwedB", u64],
            ["rewardInfos", uniformFixedSizeArray(PositionRewardInfo.struct, 3)],
        ],
        (args) =>
            new Position(
                args.whirlpool!,
                args.positionMint!,
                args.liquidity!,
                args.tickLowerIndex!,
                args.tickUpperIndex!,
                args.feeGrowthCheckpointA!,
                args.feeOwedA!,
                args.feeGrowthCheckpointB!,
                args.feeOwedB!,
                args.rewardInfos!,
            ),
        "Position",
    )
}
import {
    BeetStruct, bignum, u128, u64 
} from "@metaplex-foundation/beet"

export class PositionRewardInfo {
    constructor(
        readonly growthInsideLastX64: bignum,
        readonly rewardAmountOwed: bignum,
    ) {}

    static readonly struct = new BeetStruct<PositionRewardInfo>(
        [
            ["growthInsideLastX64",
                u128],
            ["rewardAmountOwed",
                u64],
        ],
        (args) =>
            new PositionRewardInfo(
                args.growthInsideLastX64!,
                args.rewardAmountOwed!,
            ),
        "PositionRewardInfo",
    )
}
import {
    BeetStruct, bignum, u128, u64 
} from "@metaplex-foundation/beet"

export class PositionRewardInfo {
    constructor(
        readonly growthInsideCheckpoint: bignum,
        readonly amountOwed: bignum,
    ) {}

    static readonly struct = new BeetStruct<PositionRewardInfo>(
        [
            ["growthInsideCheckpoint",
                u128],
            // Q64.64
            ["amountOwed",
                u64],
        ],
        (args) =>
            new PositionRewardInfo(
                args.growthInsideCheckpoint!,
                args.amountOwed!,
            ),
        "PositionRewardInfo",
    )
}
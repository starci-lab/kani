import {
    BeetStruct, bignum, u128, u64 
} from "@metaplex-foundation/beet"

/**
 * Reward information for a Raydium position.
 * Represents reward checkpoint and amount owed for a position.
 */
export class PositionRewardInfo {
    constructor(
        /** Reward growth inside last in Q64.64 format (u128). */
        readonly growthInsideLastX64: bignum,
        /** Reward amount owed (u64). */
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
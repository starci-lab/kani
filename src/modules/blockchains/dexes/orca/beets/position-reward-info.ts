import {
    BeetStruct, bignum, u128, u64 
} from "@metaplex-foundation/beet"

/**
 * Reward information for an Orca position.
 * Represents reward checkpoint and amount owed for a position.
 */
export class PositionRewardInfo {
    constructor(
        /** Reward growth inside checkpoint (u128, Q64.64 format). */
        readonly growthInsideCheckpoint: bignum,
        /** Amount of reward owed (u64). */
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
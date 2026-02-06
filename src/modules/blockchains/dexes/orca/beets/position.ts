import {
    BeetStruct, bignum, i32, u128, u64, uniformFixedSizeArray 
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"
import {
    PositionRewardInfo 
} from "./position-reward-info"

/**
 * Orca Whirlpool position structure.
 * Represents a liquidity position in an Orca Whirlpool.
 */
export class Position {
    constructor(
        /** Public key of the Whirlpool this position belongs to. */
        readonly whirlpool: PublicKey,
        /** Public key of the position mint (NFT). */
        readonly positionMint: PublicKey,
        /** Liquidity amount (u128). */
        readonly liquidity: bignum,
        /** Lower tick index (i32). */
        readonly tickLowerIndex: number,
        /** Upper tick index (i32). */
        readonly tickUpperIndex: number,
        /** Fee growth checkpoint for token A (u128). */
        readonly feeGrowthCheckpointA: bignum,
        /** Fee owed for token A (u64). */
        readonly feeOwedA: bignum,
        /** Fee growth checkpoint for token B (u128). */
        readonly feeGrowthCheckpointB: bignum,
        /** Fee owed for token B (u64). */
        readonly feeOwedB: bignum,
        /** Array of reward information (max 3 rewards). */
        readonly rewardInfos: Array<PositionRewardInfo>,
    ) {}

    static readonly struct = new BeetStruct<Position>(
        [
            ["whirlpool",
                publicKey],
            ["positionMint",
                publicKey],
            ["liquidity",
                u128],
            ["tickLowerIndex",
                i32],
            ["tickUpperIndex",
                i32],
            ["feeGrowthCheckpointA",
                u128],
            ["feeOwedA",
                u64],
            ["feeGrowthCheckpointB",
                u128],
            ["feeOwedB",
                u64],
            ["rewardInfos",
                uniformFixedSizeArray(PositionRewardInfo.struct,
                    3)],
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
import { 
    BeetStruct, 
    bignum, 
    fixedSizeUint8Array, 
    i32, 
    u128,
    u16,
    u64,
    uniformFixedSizeArray
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"
import {
    WhirlpoolRewardInfo 
} from "./whirlpool-reward-info"

/**
 * Orca Whirlpool structure.
 * Represents the complete state of an Orca Whirlpool liquidity pool.
 */
export class Whirlpool {
    constructor(
        /** Public key of the Whirlpools config. */
        readonly whirlpoolsConfig: PublicKey,
        /** Bump seed for PDA derivation (1 byte). */
        readonly whirlpoolBump: Uint8Array,
        /** Tick spacing (u16). */
        readonly tickSpacing: number,
        /** Fee tier index seed (2 bytes). */
        readonly feeTierIndexSeed: Array<number>,
        /** Fee rate (u16). */
        readonly feeRate: number,
        /** Protocol fee rate (u16). */
        readonly protocolFeeRate: number,
        /** Total liquidity (u128). */
        readonly liquidity: bignum,
        /** Square root price (u128). */
        readonly sqrtPrice: bignum,
        /** Current tick index (i32). */
        readonly tickCurrentIndex: number,
        /** Protocol fee owed for token A (u64). */
        readonly protocolFeeOwedA: bignum,
        /** Protocol fee owed for token B (u64). */
        readonly protocolFeeOwedB: bignum,
        /** Public key of token A mint. */
        readonly tokenMintA: PublicKey,
        /** Public key of token A vault. */
        readonly tokenVaultA: PublicKey,
        /** Fee growth global for token A (u128). */
        readonly feeGrowthGlobalA: bignum,
        /** Public key of token B mint. */
        readonly tokenMintB: PublicKey,
        /** Public key of token B vault. */
        readonly tokenVaultB: PublicKey,
        /** Fee growth global for token B (u128). */
        readonly feeGrowthGlobalB: bignum,
        /** Timestamp of last reward update (u64). */
        readonly rewardLastUpdatedTimestamp: bignum,
        /** Array of reward information (max 3 rewards). */
        readonly rewardInfos: Array<WhirlpoolRewardInfo>
    ) {}

    static readonly struct = new BeetStruct<Whirlpool>(
        [
            ["whirlpoolsConfig",
                publicKey],
            ["whirlpoolBump",
                fixedSizeUint8Array(1)],
            ["tickSpacing",
                u16],
            ["feeTierIndexSeed",
                fixedSizeUint8Array(2)],
            ["feeRate",
                u16],
            ["protocolFeeRate",
                u16],
            ["liquidity",
                u128],
            ["sqrtPrice",
                u128],
            ["tickCurrentIndex",
                i32],
            ["protocolFeeOwedA",
                u64],
            ["protocolFeeOwedB",
                u64],
            ["tokenMintA",
                publicKey],
            ["tokenVaultA",
                publicKey],
            ["feeGrowthGlobalA",
                u128],
            ["tokenMintB",
                publicKey],
            ["tokenVaultB",
                publicKey],
            ["feeGrowthGlobalB",
                u128],
            ["rewardLastUpdatedTimestamp",
                u64],
            ["rewardInfos",
                uniformFixedSizeArray(WhirlpoolRewardInfo.struct,
                    3)],
        ],
        (args) => new Whirlpool(
            args.whirlpoolsConfig!,
            args.whirlpoolBump!,
            args.tickSpacing!,
            args.feeTierIndexSeed!,
            args.feeRate!,
            args.protocolFeeRate!,
            args.liquidity!,
            args.sqrtPrice!,
            args.tickCurrentIndex!,
            args.protocolFeeOwedA!,
            args.protocolFeeOwedB!,
            args.tokenMintA!,
            args.tokenVaultA!,
            args.feeGrowthGlobalA!,
            args.tokenMintB!,
            args.tokenVaultB!,
            args.feeGrowthGlobalB!,
            args.rewardLastUpdatedTimestamp!,
            args.rewardInfos!
        ),
        "Whirlpool"
    )
}


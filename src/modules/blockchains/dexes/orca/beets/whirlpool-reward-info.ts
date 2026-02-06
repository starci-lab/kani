import {
    bignum 
} from "@metaplex-foundation/beet"
import {
    fixedSizeUint8Array, BeetStruct, u128 
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"

/**
 * Reward information for an Orca Whirlpool.
 * Represents reward token configuration and state.
 */
export class WhirlpoolRewardInfo {
    constructor(
        /** Public key of the reward token mint. */
        readonly mint: PublicKey,
        /** Public key of the reward vault. */
        readonly vault: PublicKey,
        /** Extension bytes (32 bytes). */
        readonly extension: Uint8Array,
        /** Emissions per second in Q64.64 format (u128). */
        readonly emissionsPerSecondX64: bignum,
        /** Reward growth global in Q64.64 format (u128). */
        readonly growthGlobalX64: bignum
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolRewardInfo>(
        [
            ["mint",
                publicKey],
            ["vault",
                publicKey],
            ["extension",
                fixedSizeUint8Array(32)],
            ["emissionsPerSecondX64",
                u128],
            ["growthGlobalX64",
                u128],
        ],
        (args) => new WhirlpoolRewardInfo(
            args.mint!,
            args.vault!,
            args.extension!,
            args.emissionsPerSecondX64!,
            args.growthGlobalX64!
        ),
        "WhirlpoolRewardInfo"
    )
}
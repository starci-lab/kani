import { bignum } from "@metaplex-foundation/beet"
import { fixedSizeUint8Array, BeetStruct, u128 } from "@metaplex-foundation/beet"
import { publicKey } from "@metaplex-foundation/beet-solana"
import { PublicKey } from "@solana/web3.js"

export class WhirlpoolRewardInfo {
    constructor(
        readonly mint: PublicKey,
        readonly vault: PublicKey,
        readonly extension: Uint8Array,
        readonly emissionsPerSecondX64: bignum,
        readonly growthGlobalX64: bignum
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolRewardInfo>(
        [
            ["mint", publicKey],
            ["vault", publicKey],
            ["extension", fixedSizeUint8Array(32)],
            ["emissionsPerSecondX64", u128],
            ["growthGlobalX64", u128],
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
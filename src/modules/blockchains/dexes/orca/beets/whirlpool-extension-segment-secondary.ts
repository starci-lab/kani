import {
    BeetStruct, fixedSizeUint8Array 
} from "@metaplex-foundation/beet"

/**
 * Secondary extension segment for Orca Whirlpool.
 * Contains reserved bytes for future use.
 */
export class WhirlpoolExtensionSegmentSecondary {
    constructor(
        /** Reserved bytes (32 bytes). */
        readonly reserved: Uint8Array
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolExtensionSegmentSecondary>(
        [
            ["reserved",
                fixedSizeUint8Array(32)],
        ],
        (args) => new WhirlpoolExtensionSegmentSecondary(args.reserved!),
        "WhirlpoolExtensionSegmentSecondary"
    )
}

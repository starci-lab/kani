import {
    fixedSizeUint8Array, BeetStruct, u16 
} from "@metaplex-foundation/beet"

/**
 * Primary extension segment for Orca Whirlpool.
 * Contains control flags and reserved bytes.
 */
export class WhirlpoolExtensionSegmentPrimary {
    constructor(
        /** Control flags (u16). */
        readonly controlFlags: number,
        /** Reserved bytes (30 bytes). */
        readonly reserved: Uint8Array
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolExtensionSegmentPrimary>(
        [
            ["controlFlags",
                u16],
            ["reserved",
                fixedSizeUint8Array(30)],
        ],
        (args) => new WhirlpoolExtensionSegmentPrimary(args.controlFlags!,
args.reserved!),
        "WhirlpoolExtensionSegmentPrimary"
    )
}
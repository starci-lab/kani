import {
    fixedSizeUint8Array, BeetStruct, u16 
} from "@metaplex-foundation/beet"

export class WhirlpoolExtensionSegmentPrimary {
    constructor(
        readonly controlFlags: number,
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
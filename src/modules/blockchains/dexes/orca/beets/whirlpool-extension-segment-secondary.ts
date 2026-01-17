import {
    BeetStruct, fixedSizeUint8Array 
} from "@metaplex-foundation/beet"

export class WhirlpoolExtensionSegmentSecondary {
    constructor(
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

import { BeetStruct, bignum, u64 } from "@metaplex-foundation/beet"

// ==================== ProtocolFee ====================
export class ProtocolFee {
    constructor(
    readonly amount_x: bignum,
    readonly amount_y: bignum,
    ) {}

    static readonly struct = new BeetStruct<ProtocolFee>(
        [
            ["amount_x", u64],
            ["amount_y", u64],
        ],
        (args) =>
            new ProtocolFee(
        args.amount_x!,
        args.amount_y!,
            ),
        "ProtocolFee"
    )
}
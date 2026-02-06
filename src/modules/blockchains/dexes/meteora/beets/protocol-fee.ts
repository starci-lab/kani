import {
    BeetStruct, bignum, u64 
} from "@metaplex-foundation/beet"

/**
 * Protocol fee amounts for Meteora DLMM liquidity pool.
 * Represents accumulated protocol fees in token X and Y.
 */
export class ProtocolFee {
    constructor(
    /** Protocol fee amount for token X. */
    readonly amount_x: bignum,
    /** Protocol fee amount for token Y. */
    readonly amount_y: bignum,
    ) {}

    static readonly struct = new BeetStruct<ProtocolFee>(
        [
            ["amount_x",
                u64],
            ["amount_y",
                u64],
        ],
        (args) =>
            new ProtocolFee(
        args.amount_x!,
        args.amount_y!,
            ),
        "ProtocolFee"
    )
}
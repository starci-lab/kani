import {
    BeetStruct,
    u32,
    i32,
    i64,
    fixedSizeUint8Array,
    bignum
} from "@metaplex-foundation/beet"
  
// ==================== VariableParameters ====================
export class VariableParameters {
    constructor(
      readonly volatility_accumulator: number,
      readonly volatility_reference: number,
      readonly index_reference: number,
      readonly _padding: Uint8Array,
      readonly last_update_timestamp: bignum,
      readonly _padding_1: Uint8Array,
    ) {}
  
    static readonly struct = new BeetStruct<VariableParameters>(
        [
            ["volatility_accumulator", u32],
            ["volatility_reference", u32],
            ["index_reference", i32],
            ["_padding", fixedSizeUint8Array(4)],
            ["last_update_timestamp", i64],
            ["_padding_1", fixedSizeUint8Array(8)],
        ],
        (args) =>
            new VariableParameters(
          args.volatility_accumulator!,
          args.volatility_reference!,
          args.index_reference!,
          args._padding!,
          args.last_update_timestamp!,
          args._padding_1!,
            ),
        "VariableParameters"
    )
}
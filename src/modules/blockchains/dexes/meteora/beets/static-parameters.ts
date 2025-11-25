import {
    BeetStruct,
    u16,
    u32,
    i32,
    u8,
    fixedSizeUint8Array,
} from "@metaplex-foundation/beet"
  
// ==================== StaticParameters ====================
export class StaticParameters {
    constructor(
      readonly base_factor: number,
      readonly filter_period: number,
      readonly decay_period: number,
      readonly reduction_factor: number,
      readonly variable_fee_control: number,
      readonly max_volatility_accumulator: number,
      readonly min_bin_id: number,
      readonly max_bin_id: number,
      readonly protocol_share: number,
      readonly base_fee_power_factor: number,
      readonly _padding: Uint8Array,
    ) {}
  
    static readonly struct = new BeetStruct<StaticParameters>(
        [
            ["base_factor", u16],
            ["filter_period", u16],
            ["decay_period", u16],
            ["reduction_factor", u16],
            ["variable_fee_control", u32],
            ["max_volatility_accumulator", u32],
            ["min_bin_id", i32],
            ["max_bin_id", i32],
            ["protocol_share", u16],
            ["base_fee_power_factor", u8],
            ["_padding", fixedSizeUint8Array(5)],
        ],
        (args) =>
            new StaticParameters(
          args.base_factor!,
          args.filter_period!,
          args.decay_period!,
          args.reduction_factor!,
          args.variable_fee_control!,
          args.max_volatility_accumulator!,
          args.min_bin_id!,
          args.max_bin_id!,
          args.protocol_share!,
          args.base_fee_power_factor!,
          args._padding!,
            ),
        "StaticParameters"
    )
}
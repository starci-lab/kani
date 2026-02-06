import {
    BeetStruct,
    u16,
    u32,
    i32,
    u8,
    fixedSizeUint8Array,
} from "@metaplex-foundation/beet"
  
/**
 * Static parameters for Meteora DLMM liquidity pool.
 * These parameters are fixed and do not change during pool operation.
 */
export class StaticParameters {
    constructor(
      /** Base factor for fee calculation. */
      readonly base_factor: number,
      /** Filter period for volatility calculation. */
      readonly filter_period: number,
      /** Decay period for volatility calculation. */
      readonly decay_period: number,
      /** Reduction factor for fee calculation. */
      readonly reduction_factor: number,
      /** Variable fee control parameter. */
      readonly variable_fee_control: number,
      /** Maximum volatility accumulator value. */
      readonly max_volatility_accumulator: number,
      /** Minimum bin ID allowed in the pool. */
      readonly min_bin_id: number,
      /** Maximum bin ID allowed in the pool. */
      readonly max_bin_id: number,
      /** Protocol share percentage. */
      readonly protocol_share: number,
      /** Base fee power factor. */
      readonly base_fee_power_factor: number,
      /** Padding bytes. */
      readonly _padding: Uint8Array,
    ) {}
  
    static readonly struct = new BeetStruct<StaticParameters>(
        [
            ["base_factor",
                u16],
            ["filter_period",
                u16],
            ["decay_period",
                u16],
            ["reduction_factor",
                u16],
            ["variable_fee_control",
                u32],
            ["max_volatility_accumulator",
                u32],
            ["min_bin_id",
                i32],
            ["max_bin_id",
                i32],
            ["protocol_share",
                u16],
            ["base_fee_power_factor",
                u8],
            ["_padding",
                fixedSizeUint8Array(5)],
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
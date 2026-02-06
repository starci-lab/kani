import {
    BeetStruct,
    u8,
    u16,
    u64,
    i32,
    i64,
    fixedSizeUint8Array,
    uniformFixedSizeArray,
    bignum,
} from "@metaplex-foundation/beet"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"
import {
    PublicKey 
} from "@solana/web3.js"

// Import nested structs
import {
    StaticParameters 
} from "./static-parameters"
import {
    VariableParameters 
} from "./variable-parameters"
import {
    ProtocolFee 
} from "./protocol-fee"
import {
    RewardInfo 
} from "./reward-info"
  
/**
 * Meteora DLMM liquidity pool (LbPair) structure.
 * Represents the complete state of a Meteora Dynamic Liquidity Market Maker pool.
 */
export class LbPair {
    constructor(
      /** Static parameters of the pool. */
      readonly parameters: StaticParameters,
      /** Variable parameters of the pool. */
      readonly v_parameters: VariableParameters,
      /** Bump seed for PDA derivation. */
      readonly bump_seed: Uint8Array,
      /** Bin step seed. */
      readonly bin_step_seed: Uint8Array,
      /** Type of the pair. */
      readonly pair_type: number,
      /** Currently active bin ID. */
      readonly active_id: number,
      /** Bin step size. */
      readonly bin_step: number,
      /** Pool status. */
      readonly status: number,
      /** Whether base factor seed is required. */
      readonly require_base_factor_seed: number,
      /** Base factor seed. */
      readonly base_factor_seed: Uint8Array,
      /** Activation type. */
      readonly activation_type: number,
      /** Creator pool on/off control flag. */
      readonly creator_pool_on_off_control: number,
      /** Public key of token X mint. */
      readonly token_x_mint: PublicKey,
      /** Public key of token Y mint. */
      readonly token_y_mint: PublicKey,
      /** Public key of token X reserve. */
      readonly reserve_x: PublicKey,
      /** Public key of token Y reserve. */
      readonly reserve_y: PublicKey,
      /** Protocol fee information. */
      readonly protocol_fee: ProtocolFee,
      /** Padding bytes. */
      readonly _padding_1: Uint8Array,
      /** Array of reward information. */
      readonly reward_infos: Array<RewardInfo>,
      /** Public key of the oracle. */
      readonly oracle: PublicKey,
      /** Bitmap of bin arrays. */
      readonly bin_array_bitmap: Array<bignum>,
      /** Timestamp of last update. */
      readonly last_updated_at: bignum,
      /** Additional padding bytes. */
      readonly _padding_2: Uint8Array,
      /** Pre-activation swap address. */
      readonly pre_activation_swap_address: PublicKey,
      /** Base key for the pool. */
      readonly base_key: PublicKey,
      /** Activation point timestamp. */
      readonly activation_point: bignum,
      /** Pre-activation duration. */
      readonly pre_activation_duration: bignum,
      /** Additional padding bytes. */
      readonly _padding_3: Uint8Array,
      /** Additional padding value. */
      readonly _padding_4: bignum,
      /** Public key of the pool creator. */
      readonly creator: PublicKey,
      /** Token mint X program flag. */
      readonly token_mint_x_program_flag: number,
      /** Token mint Y program flag. */
      readonly token_mint_y_program_flag: number,
      /** Reserved bytes. */
      readonly _reserved: Uint8Array,
    ) {}
  
    static readonly struct = new BeetStruct<LbPair>(
        [
            ["parameters",
                StaticParameters.struct],
            ["v_parameters",
                VariableParameters.struct],
            ["bump_seed",
                fixedSizeUint8Array(1)],
            ["bin_step_seed",
                fixedSizeUint8Array(2)],
            ["pair_type",
                u8],
            ["active_id",
                i32],
            ["bin_step",
                u16],
            ["status",
                u8],
            ["require_base_factor_seed",
                u8],
            ["base_factor_seed",
                fixedSizeUint8Array(2)],
            ["activation_type",
                u8],
            ["creator_pool_on_off_control",
                u8],
            ["token_x_mint",
                publicKey],
            ["token_y_mint",
                publicKey],
            ["reserve_x",
                publicKey],
            ["reserve_y",
                publicKey],
            ["protocol_fee",
                ProtocolFee.struct],
            ["_padding_1",
                fixedSizeUint8Array(32)],
            ["reward_infos",
                uniformFixedSizeArray(RewardInfo.struct,
                    2)],
            ["oracle",
                publicKey],
            ["bin_array_bitmap",
                uniformFixedSizeArray(u64,
                    16)],
            ["last_updated_at",
                i64],
            ["_padding_2",
                fixedSizeUint8Array(32)],
            ["pre_activation_swap_address",
                publicKey],
            ["base_key",
                publicKey],
            ["activation_point",
                u64],
            ["pre_activation_duration",
                u64],
            ["_padding_3",
                fixedSizeUint8Array(8)],
            ["_padding_4",
                u64],
            ["creator",
                publicKey],
            ["token_mint_x_program_flag",
                u8],
            ["token_mint_y_program_flag",
                u8],
            ["_reserved",
                fixedSizeUint8Array(22)],
        ],
        (args) =>
            new LbPair(
          args.parameters!,
          args.v_parameters!,
          args.bump_seed!,
          args.bin_step_seed!,
          args.pair_type!,
          args.active_id!,
          args.bin_step!,
          args.status!,
          args.require_base_factor_seed!,
          args.base_factor_seed!,
          args.activation_type!,
          args.creator_pool_on_off_control!,
          args.token_x_mint!,
          args.token_y_mint!,
          args.reserve_x!,
          args.reserve_y!,
          args.protocol_fee!,
          args._padding_1!,
          args.reward_infos!,
          args.oracle!,
          args.bin_array_bitmap!,
          args.last_updated_at!,
          args._padding_2!,
          args.pre_activation_swap_address!,
          args.base_key!,
          args.activation_point!,
          args.pre_activation_duration!,
          args._padding_3!,
          args._padding_4!,
          args.creator!,
          args.token_mint_x_program_flag!,
          args.token_mint_y_program_flag!,
          args._reserved!,
            ),
        "LbPair"
    )
}
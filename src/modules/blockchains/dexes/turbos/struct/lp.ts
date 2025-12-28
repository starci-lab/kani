import { SuiObjectI32, SuiObjectID, TypeName } from "./types"

// ===== Turbos Position NFT =====
export interface TurbosPositionNFT {
    coin_type_a: TypeName
    coin_type_b: TypeName

    fee_type: TypeName

    description: string

    id: SuiObjectID

    img_url: string

    name: string

    pool_id: string

    position_id: string
}

// ===== Turbos reward info =====
export interface TurbosPositionRewardInfo {
    fields: {
        amount_owed: string // u64 / u128
        reward_growth_inside: string // u128
    }
    type: string // ::position_manager::PositionRewardInfo
}

// ===== Turbos CLMM Position =====
export interface TurbosClmmPosition {
    id: SuiObjectID

    liquidity: string // u128

    fee_growth_inside_a: string // u128
    fee_growth_inside_b: string // u128

    tokens_owed_a: string // u64 / u128
    tokens_owed_b: string

    tick_lower_index: SuiObjectI32
    tick_upper_index: SuiObjectI32

    reward_infos: Array<TurbosPositionRewardInfo>
}

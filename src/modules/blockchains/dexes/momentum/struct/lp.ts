import { SuiObjectI32, SuiObjectID, TypeName } from "./types"

// ===== Reward info (empty array is valid) =====
export interface PositionRewardInfo {
    fields: {
        coins_owed_reward: string
        reward_growth_inside_last: string
    }
    type: string
}

// ===== CLMM Liquidity Position =====
export interface MomentumClmmPosition {
    id: SuiObjectID

    pool_id: string

    liquidity: string // u128 → string

    fee_rate: string // u64 (bps)

    fee_growth_inside_x_last: string // u128
    fee_growth_inside_y_last: string // u128

    owed_coin_x: string // u64 / u128
    owed_coin_y: string

    tick_lower_index: SuiObjectI32
    tick_upper_index: SuiObjectI32

    type_x: TypeName
    type_y: TypeName

    reward_infos: Array<PositionRewardInfo>
}

import { SuiObjectI32, SuiObjectID, TypeName } from "./types"

// ===== Reward info =====
export interface PositionRewardInfo {
    fields: {
        coins_owed_reward: string // u64 / u128 -> string
        reward_growth_inside_last: string // u128 -> string
    }
    type: string // ::position::PositionRewardInfo
}

// ===== Main Liquidity Position =====
export interface FlowxClmmPosition {
    coin_type_x: TypeName
    coin_type_y: TypeName

    coins_owed_x: string // u64 / u128
    coins_owed_y: string

    fee_growth_inside_x_last: string // u128
    fee_growth_inside_y_last: string // u128

    fee_rate: string // u64 (bps)

    id: SuiObjectID

    liquidity: string // u128

    pool_id: string

    reward_infos: Array<PositionRewardInfo>

    tick_lower_index: SuiObjectI32
    tick_upper_index: SuiObjectI32
}

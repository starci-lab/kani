import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../structs"
import { parseSuiI32 } from "../../../structs/sui/parsers/int"

// ========== Position Reward Info Types ==========
export interface FlowXSuiObjectPositionRewardInfo {
    fields: {
        coins_owed_reward: string // u64 / u128 -> string
        reward_growth_inside_last: string // u128 -> string
    }
    type: string // ::position::PositionRewardInfo
}

// ========== RAW POSITION STRUCT ==========
export interface FlowXSuiObjectPositionFields {
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
    reward_infos: Array<FlowXSuiObjectPositionRewardInfo>
    tick_lower_index: SuiObjectI32
    tick_upper_index: SuiObjectI32
}

export type FlowXSuiObjectPosition = SuiObject<
    FlowXSuiObjectPositionFields,
    `${string}::position::Position`
>

// ========== POSITION INTERFACE (Raw Structure - matches Sui object fields) ==========
// This interface matches the raw Sui object structure for direct field access
// Alias to SuiObjectPositionFields for convenience
export type FlowXClmmPosition = FlowXSuiObjectPositionFields

// ========== PARSED POSITION INTERFACE ==========
export interface FlowXPosition {
    coinTypeX: string
    coinTypeY: string
    coinsOwedX: BN
    coinsOwedY: BN
    feeGrowthInsideXLast: BN
    feeGrowthInsideYLast: BN
    feeRate: BN
    id: string
    liquidity: BN
    poolId: string
    rewardInfos: Array<{
        coinsOwedReward: BN
        rewardGrowthInsideLast: BN
    }>
    tickLowerIndex: BN
    tickUpperIndex: BN
}

// ========== PARSER FUNCTION ==========
/**
 * Parses a FlowX Position Sui object into a FlowxPosition interface
 */
export const parseFlowXPosition = (target: FlowXSuiObjectPositionFields): FlowXPosition => {
    return {
        coinTypeX: target.coin_type_x.fields.name,
        coinTypeY: target.coin_type_y.fields.name,
        coinsOwedX: new BN(target.coins_owed_x),
        coinsOwedY: new BN(target.coins_owed_y),
        feeGrowthInsideXLast: new BN(target.fee_growth_inside_x_last),
        feeGrowthInsideYLast: new BN(target.fee_growth_inside_y_last),
        feeRate: new BN(target.fee_rate),
        id: target.id.id,
        liquidity: new BN(target.liquidity),
        poolId: target.pool_id,
        rewardInfos: target.reward_infos.map((reward) => ({
            coinsOwedReward: new BN(reward.fields.coins_owed_reward),
            rewardGrowthInsideLast: new BN(reward.fields.reward_growth_inside_last),
        })),
        tickLowerIndex: parseSuiI32(target.tick_lower_index),
        tickUpperIndex: parseSuiI32(target.tick_upper_index),
    }
}

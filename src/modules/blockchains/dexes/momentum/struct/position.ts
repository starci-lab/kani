import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../structs"
import { parseSuiI32 } from "../../../structs/sui/parsers/int"

// ========== Position Reward Info Types ==========
export interface MomentumSuiObjectPositionRewardInfo {
    fields: {
        coins_owed_reward: string
        reward_growth_inside_last: string
    }
    type: string
}

// ========== RAW POSITION STRUCT ==========
export interface MomentumSuiObjectPositionFields {
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
    reward_infos: Array<MomentumSuiObjectPositionRewardInfo>
}

export type MomentumSuiObjectPosition = SuiObject<
    MomentumSuiObjectPositionFields,
    `${string}::position::Position`
>

// ========== POSITION INTERFACE (Raw Structure - matches Sui object fields) ==========
// This interface matches the raw Sui object structure for direct field access
// Alias to SuiObjectPositionFields for convenience
export type MomentumClmmPosition = MomentumSuiObjectPositionFields

// ========== PARSED POSITION INTERFACE ==========
export interface MomentumPosition {
    id: string
    poolId: string
    liquidity: BN
    feeRate: BN
    feeGrowthInsideXLast: BN
    feeGrowthInsideYLast: BN
    owedCoinX: BN
    owedCoinY: BN
    tickLowerIndex: BN
    tickUpperIndex: BN
    typeX: string
    typeY: string
    rewardInfos: Array<{
        coinsOwedReward: BN
        rewardGrowthInsideLast: BN
    }>
}

// ========== PARSER FUNCTION ==========
/**
 * Parses a Momentum Position Sui object into a MomentumPosition interface
 */
export const parseMomentumPosition = (target: MomentumSuiObjectPositionFields): MomentumPosition => {
    return {
        id: target.id.id,
        poolId: target.pool_id,
        liquidity: new BN(target.liquidity),
        feeRate: new BN(target.fee_rate),
        feeGrowthInsideXLast: new BN(target.fee_growth_inside_x_last),
        feeGrowthInsideYLast: new BN(target.fee_growth_inside_y_last),
        owedCoinX: new BN(target.owed_coin_x),
        owedCoinY: new BN(target.owed_coin_y),
        tickLowerIndex: parseSuiI32(target.tick_lower_index),
        tickUpperIndex: parseSuiI32(target.tick_upper_index),
        typeX: target.type_x.fields.name,
        typeY: target.type_y.fields.name,
        rewardInfos: target.reward_infos.map((reward) => ({
            coinsOwedReward: new BN(reward.fields.coins_owed_reward),
            rewardGrowthInsideLast: new BN(reward.fields.reward_growth_inside_last),
        })),
    }
}

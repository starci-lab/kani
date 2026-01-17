import BN from "bn.js"
import {
    parseSuiI32,
    SuiObject,
    SuiObjectI32,
} from "../../../structs"

// ========== PositionInfo Types (fees/rewards snapshot) ==========

export interface CetusSuiObjectPositionRewardFields {
    amount_owned: string
    growth_inside: string
}

export type CetusSuiObjectPositionReward = SuiObject<
    CetusSuiObjectPositionRewardFields,
    `${string}::position::PositionReward`
>

export interface CetusSuiObjectPositionInfoFields {
    fee_growth_inside_a: string
    fee_growth_inside_b: string
    fee_owned_a: string
    fee_owned_b: string
    liquidity: string
    points_growth_inside: string
    points_owned: string
    position_id: string
    rewards: Array<CetusSuiObjectPositionReward>
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
}

export type CetusSuiObjectPositionInfo = SuiObject<
    CetusSuiObjectPositionInfoFields,
    `${string}::position::PositionInfo`
>

// ========== Parsed PositionInfo ==========
export interface CetusPositionInfo {
    feeGrowthInsideA: BN
    feeGrowthInsideB: BN
    feeOwnedA: BN
    feeOwnedB: BN
    liquidity: BN
    pointsGrowthInside: BN
    pointsOwned: BN
    positionId: string
    rewards: Array<{
        amountOwned: BN
        growthInside: BN
        type: string
    }>
    tickLowerIndex: BN
    tickUpperIndex: BN
}

export const parseCetusPositionInfo = (
    target: CetusSuiObjectPositionInfoFields,
): CetusPositionInfo => {
    return {
        feeGrowthInsideA: new BN(target.fee_growth_inside_a),
        feeGrowthInsideB: new BN(target.fee_growth_inside_b),
        feeOwnedA: new BN(target.fee_owned_a),
        feeOwnedB: new BN(target.fee_owned_b),
        liquidity: new BN(target.liquidity),
        pointsGrowthInside: new BN(target.points_growth_inside),
        pointsOwned: new BN(target.points_owned),
        positionId: target.position_id,
        rewards: (target.rewards ?? []).map((reward) => ({
            amountOwned: new BN(reward.fields.amount_owned),
            growthInside: new BN(reward.fields.growth_inside),
            type: reward.type,
        })),
        tickLowerIndex: parseSuiI32(target.tick_lower_index),
        tickUpperIndex: parseSuiI32(target.tick_upper_index),
    }
}
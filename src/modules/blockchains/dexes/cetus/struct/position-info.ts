import BN from "bn.js"
import {
    parseSuiI32,
    SuiObject,
    SuiObjectI32,
} from "../../../structs"

/**
 * Fields structure for Cetus position reward Sui object.
 * Represents reward information for a position.
 */
export interface CetusSuiObjectPositionRewardFields {
    /** Amount of reward owned. */
    amount_owned: string
    /** Growth inside the position range. */
    growth_inside: string
}

/**
 * Cetus position reward Sui object type.
 */
export type CetusSuiObjectPositionReward = SuiObject<
    CetusSuiObjectPositionRewardFields,
    `${string}::position::PositionReward`
>

/**
 * Fields structure for Cetus position info Sui object.
 * Contains fees and rewards snapshot for a position.
 */
export interface CetusSuiObjectPositionInfoFields {
    /** Fee growth inside for token A. */
    fee_growth_inside_a: string
    /** Fee growth inside for token B. */
    fee_growth_inside_b: string
    /** Fee owned for token A. */
    fee_owned_a: string
    /** Fee owned for token B. */
    fee_owned_b: string
    /** Liquidity amount. */
    liquidity: string
    /** Points growth inside. */
    points_growth_inside: string
    /** Points owned. */
    points_owned: string
    /** Position ID. */
    position_id: string
    /** Array of position rewards. */
    rewards: Array<CetusSuiObjectPositionReward>
    /** Lower tick index. */
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    /** Upper tick index. */
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
}

/**
 * Cetus position info Sui object type.
 */
export type CetusSuiObjectPositionInfo = SuiObject<
    CetusSuiObjectPositionInfoFields,
    `${string}::position::PositionInfo`
>

/**
 * Parsed Cetus position info interface.
 * Contains parsed fee and reward information for a position.
 */
export interface CetusPositionInfo {
    /** Fee growth inside for token A. */
    feeGrowthInsideA: BN
    /** Fee growth inside for token B. */
    feeGrowthInsideB: BN
    /** Fee owned for token A. */
    feeOwnedA: BN
    /** Fee owned for token B. */
    feeOwnedB: BN
    /** Liquidity amount. */
    liquidity: BN
    /** Points growth inside. */
    pointsGrowthInside: BN
    /** Points owned. */
    pointsOwned: BN
    /** Position ID. */
    positionId: string
    /** Array of parsed position rewards. */
    rewards: Array<{
        /** Amount of reward owned. */
        amountOwned: BN
        /** Growth inside the position range. */
        growthInside: BN
        /** Reward type. */
        type: string
    }>
    /** Lower tick index. */
    tickLowerIndex: BN
    /** Upper tick index. */
    tickUpperIndex: BN
}

/**
 * Parses Cetus position info Sui object fields into a parsed interface.
 *
 * @param target - Raw Sui object fields
 * @returns Parsed position info
 *
 * @example
 * const parsed = parseCetusPositionInfo(positionInfoFields)
 */
export const parseCetusPositionInfo = (target: CetusSuiObjectPositionInfoFields): CetusPositionInfo => {
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
import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../types"
import {
    parseSuiI32,
} from "../../../utils"

/**
 * Represents the reward info fields of a Momentum Position Sui object.
 */
export interface MomentumSuiObjectPositionRewardInfo {
    /** Fields containing reward information. */
    fields: {
        /** Coins owed as reward (u64/u128 as string). */
        coins_owed_reward: string
        /** Reward growth inside last (u128 as string). */
        reward_growth_inside_last: string
    }
    /** Type name of the reward info object. */
    type: string
}

/**
 * Represents the raw fields of a Momentum Position Sui object.
 * This interface matches the exact structure returned from Sui blockchain.
 */
export interface MomentumSuiObjectPositionFields {
    /** Position object ID. */
    id: SuiObjectID
    /** Pool ID. */
    pool_id: string
    /** Liquidity amount (u128 as string). */
    liquidity: string
    /** Fee rate (u64 in bps as string). */
    fee_rate: string
    /** Fee growth inside X last (u128 as string). */
    fee_growth_inside_x_last: string
    /** Fee growth inside Y last (u128 as string). */
    fee_growth_inside_y_last: string
    /** Owed coin X (u64/u128 as string). */
    owed_coin_x: string
    /** Owed coin Y (u64/u128 as string). */
    owed_coin_y: string
    /** Lower tick index (i32). */
    tick_lower_index: SuiObjectI32
    /** Upper tick index (i32). */
    tick_upper_index: SuiObjectI32
    /** Type X. */
    type_x: TypeName
    /** Type Y. */
    type_y: TypeName
    /** Array of reward information. */
    reward_infos: Array<MomentumSuiObjectPositionRewardInfo>
}

/**
 * Type alias for Momentum Position Sui object.
 */
export type MomentumSuiObjectPosition = SuiObject<
    MomentumSuiObjectPositionFields,
    `${string}::position::Position`
>

/**
 * Alias for MomentumSuiObjectPositionFields.
 * Represents the raw position structure matching Sui object fields.
 */
export type MomentumClmmPosition = MomentumSuiObjectPositionFields

/**
 * Parsed Momentum position interface with normalized field names and BN types.
 */
export interface MomentumPosition {
    /** Position ID. */
    id: string
    /** Pool ID. */
    poolId: string
    /** Liquidity amount. */
    liquidity: BN
    /** Fee rate. */
    feeRate: BN
    /** Fee growth inside X last. */
    feeGrowthInsideXLast: BN
    /** Fee growth inside Y last. */
    feeGrowthInsideYLast: BN
    /** Owed coin X. */
    owedCoinX: BN
    /** Owed coin Y. */
    owedCoinY: BN
    /** Lower tick index. */
    tickLowerIndex: BN
    /** Upper tick index. */
    tickUpperIndex: BN
    /** Type X. */
    typeX: string
    /** Type Y. */
    typeY: string
    /** Array of reward information. */
    rewardInfos: Array<{
        /** Coins owed as reward. */
        coinsOwedReward: BN
        /** Reward growth inside last. */
        rewardGrowthInsideLast: BN
    }>
}

/**
 * Parses a Momentum Position Sui object into a normalized MomentumPosition interface.
 *
 * @param target - The raw Momentum position fields from Sui object
 * @returns Parsed position with normalized field names and BN types
 *
 * @example
 * const position = parseMomentumPosition(suiObject.content.fields)
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

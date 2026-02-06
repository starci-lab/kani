import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../types"
import {
    parseSuiI32 
} from "../../../utils"

/**
 * Represents the reward info fields of a FlowX Position Sui object.
 */
export interface FlowXSuiObjectPositionRewardInfo {
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
 * Represents the raw fields of a FlowX Position Sui object.
 * This interface matches the exact structure returned from Sui blockchain.
 */
export interface FlowXSuiObjectPositionFields {
    /** Coin type X. */
    coin_type_x: TypeName
    /** Coin type Y. */
    coin_type_y: TypeName
    /** Coins owed X (u64/u128 as string). */
    coins_owed_x: string
    /** Coins owed Y (u64/u128 as string). */
    coins_owed_y: string
    /** Fee growth inside X last (u128 as string). */
    fee_growth_inside_x_last: string
    /** Fee growth inside Y last (u128 as string). */
    fee_growth_inside_y_last: string
    /** Fee rate (u64 in bps as string). */
    fee_rate: string
    /** Position object ID. */
    id: SuiObjectID
    /** Liquidity amount (u128 as string). */
    liquidity: string
    /** Pool ID. */
    pool_id: string
    /** Array of reward information. */
    reward_infos: Array<FlowXSuiObjectPositionRewardInfo>
    /** Lower tick index (i32). */
    tick_lower_index: SuiObjectI32
    /** Upper tick index (i32). */
    tick_upper_index: SuiObjectI32
}

/**
 * Type alias for FlowX Position Sui object.
 */
export type FlowXSuiObjectPosition = SuiObject<
    FlowXSuiObjectPositionFields,
    `${string}::position::Position`
>

/**
 * Alias for FlowXSuiObjectPositionFields.
 * Represents the raw position structure matching Sui object fields.
 */
export type FlowXClmmPosition = FlowXSuiObjectPositionFields

/**
 * Parsed FlowX position interface with normalized field names and BN types.
 */
export interface FlowXPosition {
    /** Coin type X. */
    coinTypeX: string
    /** Coin type Y. */
    coinTypeY: string
    /** Coins owed X. */
    coinsOwedX: BN
    /** Coins owed Y. */
    coinsOwedY: BN
    /** Fee growth inside X last. */
    feeGrowthInsideXLast: BN
    /** Fee growth inside Y last. */
    feeGrowthInsideYLast: BN
    /** Fee rate. */
    feeRate: BN
    /** Position ID. */
    id: string
    /** Liquidity amount. */
    liquidity: BN
    /** Pool ID. */
    poolId: string
    /** Array of reward information. */
    rewardInfos: Array<{
        /** Coins owed as reward. */
        coinsOwedReward: BN
        /** Reward growth inside last. */
        rewardGrowthInsideLast: BN
    }>
    /** Lower tick index. */
    tickLowerIndex: BN
    /** Upper tick index. */
    tickUpperIndex: BN
}

/**
 * Parses a FlowX Position Sui object into a normalized FlowXPosition interface.
 *
 * @param target - The raw FlowX position fields from Sui object
 * @returns Parsed position with normalized field names and BN types
 *
 * @example
 * const position = parseFlowXPosition(suiObject.content.fields)
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

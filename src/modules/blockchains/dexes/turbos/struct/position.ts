import BN from "bn.js"
import {
    SuiObject,
    SuiObjectI32,
} from "../../../types"
import {
    parseSuiI32
} from "../../../utils"

// ========== Position Reward Info Types ==========
export interface TurbosSuiObjectPositionRewardInfo {
    fields: {
        coins_owed_reward: string
        reward_growth_inside: string
    }
    type: string
}

// ========== RAW POSITION STRUCT ==========
export interface TurbosSuiObjectPositionFields {
    liquidity: string // u128 → string
    fee_growth_inside_a: string // u128
    fee_growth_inside_b: string // u128
    tokens_owed_a: string // u64 / u128
    tokens_owed_b: string
    tick_lower_index: SuiObjectI32
    tick_upper_index: SuiObjectI32
    reward_infos: Array<TurbosSuiObjectPositionRewardInfo>
}

export type TurbosSuiObjectPosition = SuiObject<
    TurbosSuiObjectPositionFields,
    `${string}::position::Position`
>

// ========== POSITION INTERFACE (Raw Structure - matches Sui object fields) ==========
// This interface matches the raw Sui object structure for direct field access
// Alias to SuiObjectPositionFields for convenience
export type TurbosClmmPosition = TurbosSuiObjectPositionFields

// ========== PARSED POSITION INTERFACE ==========
export interface TurbosPosition {
    liquidity: BN
    feeGrowthInsideA: BN
    feeGrowthInsideB: BN
    tokensOwedA: BN
    tokensOwedB: BN
    tickLowerIndex: BN
    tickUpperIndex: BN
    rewardInfos: Array<{
        coinsOwedReward: BN
        rewardGrowthInside: BN
    }>
}

// ========== PARSER FUNCTION ==========
/**
 * Parses a Turbos Position Sui object into a TurbosPosition interface
 */
export const parseTurbosPosition = (target: TurbosSuiObjectPositionFields): TurbosPosition => {
    return {
        liquidity: new BN(target.liquidity),
        feeGrowthInsideA: new BN(target.fee_growth_inside_a),
        feeGrowthInsideB: new BN(target.fee_growth_inside_b),
        tokensOwedA: new BN(target.tokens_owed_a),
        tokensOwedB: new BN(target.tokens_owed_b),
        tickLowerIndex: parseSuiI32(target.tick_lower_index),
        tickUpperIndex: parseSuiI32(target.tick_upper_index),
        rewardInfos: target.reward_infos.map((reward) => ({
            coinsOwedReward: new BN(reward.fields.coins_owed_reward),
            rewardGrowthInside: new BN(reward.fields.reward_growth_inside),
        })),
    }
}

// ========== POSITION NFT STRUCT ==========
export interface TurbosPositionNFT {
    positionId: string
}
export interface TurbosSuiObjectPositionNFTFields {
    position_id: string
}

export type TurbosSuiObjectPositionNFT = SuiObject<
    TurbosSuiObjectPositionNFTFields,
    `${string}::position_nft::PositionNFT`
>

export const parseTurbosSuiObjectPositionNFT = (target: TurbosSuiObjectPositionNFTFields): TurbosPositionNFT => {
    return {
        positionId: target.position_id,
    }
}
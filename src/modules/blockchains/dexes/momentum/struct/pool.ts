import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    SuiObjectI64,
    TypeName,
    parseSuiI32, 
    parseSuiI64 
} from "../../../structs"

/**
 * Represents the observation fields of a Momentum Pool Sui object.
 */
export interface MomentumSuiObjectPoolObservation {
    /** Type name of the observation object. */
    type: string
    /** Observation fields. */
    fields: {
        /** Whether the observation is initialized. */
        initialized: boolean
        /** Seconds per liquidity cumulative (u128 as string). */
        seconds_per_liquidity_cumulative: string
        /** Tick cumulative (i64 object). */
        tick_cumulative: SuiObjectI64
        /** Timestamp in seconds (u64 as string). */
        timestamp_s: string
    }
}

/**
 * Represents the reward info fields of a Momentum Pool Sui object.
 */
export interface MomentumSuiObjectPoolRewardInfo {
    /** Type name of the reward info object. */
    type: string
    /** Reward info fields. */
    fields: {
        /** Ended at seconds (u64 as string). */
        ended_at_seconds: string
        /** Last update time (u64 as string). */
        last_update_time: string
        /** Reward coin type. */
        reward_coin_type: TypeName
        /** Reward growth global (u128 as string). */
        reward_growth_global: string
        /** Reward per seconds (u64 as string). */
        reward_per_seconds: string
        /** Total reward (u128 as string). */
        total_reward: string
        /** Total reward allocated (u128 as string). */
        total_reward_allocated: string
    }
}

/**
 * Represents the raw fields of a Momentum Pool Sui object.
 * This interface matches the exact structure returned from Sui blockchain.
 */
export interface MomentumSuiObjectPoolFields {
    /** Fee growth global X (u128 as string). */
    fee_growth_global_x: string
    /** Fee growth global Y (u128 as string). */
    fee_growth_global_y: string
    /** Flash loan fee rate (u64 as string). */
    flash_loan_fee_rate: string
    /** Pool object ID. */
    id: SuiObjectID
    /** Liquidity amount (u128 as string). */
    liquidity: string
    /** Max liquidity per tick (u128 as string). */
    max_liquidity_per_tick: string
    /** Observation cardinality (u16 as string). */
    observation_cardinality: string
    /** Observation cardinality next (u16 as string). */
    observation_cardinality_next: string
    /** Observation index (u16 as string). */
    observation_index: string
    /** Array of observations. */
    observations: Array<MomentumSuiObjectPoolObservation>
    /** Protocol fee share (u64 as string). */
    protocol_fee_share: string
    /** Protocol fee X (u64 as string). */
    protocol_fee_x: string
    /** Protocol fee Y (u64 as string). */
    protocol_fee_y: string
    /** Protocol flash loan fee share (u64 as string). */
    protocol_flash_loan_fee_share: string
    /** Reserve X (u64 as string). */
    reserve_x: string
    /** Reserve Y (u64 as string). */
    reserve_y: string
    /** Array of reward information. */
    reward_infos: Array<MomentumSuiObjectPoolRewardInfo>
    /** Square root price (u128 as string). */
    sqrt_price: string
    /** Swap fee rate (u64 as string). */
    swap_fee_rate: string
    /** Current tick index (i32). */
    tick_index: SuiObjectI32
    /** Tick spacing. */
    tick_spacing: number
    /** Type X. */
    type_x: TypeName
    /** Type Y. */
    type_y: TypeName
}

/**
 * Type alias for Momentum Pool Sui object.
 */
export type MomentumSuiObjectPool = SuiObject<
    MomentumSuiObjectPoolFields,
    `${string}::pool::Pool`
>

/**
 * Parsed Momentum pool interface with normalized field names and BN types.
 */
export interface MomentumPool {
    feeGrowthGlobalX: BN
    feeGrowthGlobalY: BN
    flashLoanFeeRate: BN
    id: string
    liquidity: BN
    maxLiquidityPerTick: BN
    observationCardinality: BN
    observationCardinalityNext: BN
    observationIndex: BN
    observations: Array<{
        initialized: boolean
        secondsPerLiquidityCumulative: BN
        tickCumulative: BN
        timestampS: BN
    }>
    protocolFeeShare: BN
    protocolFeeX: BN
    protocolFeeY: BN
    protocolFlashLoanFeeShare: BN
    reserveX: BN
    reserveY: BN
    rewardInfos: Array<{
        endedAtSeconds: BN
        lastUpdateTime: BN
        rewardCoinType: string
        rewardGrowthGlobal: BN
        rewardPerSeconds: BN
        totalReward: BN
        totalRewardAllocated: BN
    }>
    sqrtPrice: BN
    swapFeeRate: BN
    tickIndex: BN
    tickSpacing: number
    typeX: string
    typeY: string
}

/**
 * Parses a Momentum Pool Sui object into a normalized MomentumPool interface.
 *
 * @param target - The raw Momentum pool fields from Sui object
 * @returns Parsed pool with normalized field names and BN types
 *
 * @example
 * const pool = parseMomentumPool(suiObject.content.fields)
 */
export const parseMomentumPool = (target: MomentumSuiObjectPoolFields): MomentumPool => {
    return {
        feeGrowthGlobalX: new BN(target.fee_growth_global_x),
        feeGrowthGlobalY: new BN(target.fee_growth_global_y),
        flashLoanFeeRate: new BN(target.flash_loan_fee_rate),
        id: target.id.id,
        liquidity: new BN(target.liquidity),
        maxLiquidityPerTick: new BN(target.max_liquidity_per_tick),
        observationCardinality: new BN(target.observation_cardinality),
        observationCardinalityNext: new BN(target.observation_cardinality_next),
        observationIndex: new BN(target.observation_index),
        observations: target.observations.map((observation) => ({
            initialized: observation.fields.initialized,
            secondsPerLiquidityCumulative: new BN(observation.fields.seconds_per_liquidity_cumulative),
            tickCumulative: parseSuiI64(observation.fields.tick_cumulative),
            timestampS: new BN(observation.fields.timestamp_s),
        })),
        protocolFeeShare: new BN(target.protocol_fee_share),
        protocolFeeX: new BN(target.protocol_fee_x),
        protocolFeeY: new BN(target.protocol_fee_y),
        protocolFlashLoanFeeShare: new BN(target.protocol_flash_loan_fee_share),
        reserveX: new BN(target.reserve_x),
        reserveY: new BN(target.reserve_y),
        rewardInfos: target.reward_infos.map((rewardInfo) => ({
            endedAtSeconds: new BN(rewardInfo.fields.ended_at_seconds),
            lastUpdateTime: new BN(rewardInfo.fields.last_update_time),
            rewardCoinType: rewardInfo.fields.reward_coin_type.fields.name,
            rewardGrowthGlobal: new BN(rewardInfo.fields.reward_growth_global),
            rewardPerSeconds: new BN(rewardInfo.fields.reward_per_seconds),
            totalReward: new BN(rewardInfo.fields.total_reward),
            totalRewardAllocated: new BN(rewardInfo.fields.total_reward_allocated),
        })),
        sqrtPrice: new BN(target.sqrt_price),
        swapFeeRate: new BN(target.swap_fee_rate),
        tickIndex: parseSuiI32(target.tick_index),
        tickSpacing: target.tick_spacing,
        typeX: target.type_x.fields.name,
        typeY: target.type_y.fields.name,
    }
}

import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    SuiObjectI64,
    TypeName,
    SuiObjectTable,
} from "../../../types"
import {
    parseSuiI32,
    parseSuiI64,
} from "../../../utils"

/**
 * Represents the observation fields of a FlowX Pool Sui object.
 */
export interface FlowxSuiObjectPoolObservation {
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
    /** Type name of the observation object. */
    type: string
}

/**
 * Represents the reward info fields of a FlowX Pool Sui object.
 */
export interface FlowxSuiObjectPoolRewardInfo {
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
    /** Type name of the reward info object. */
    type: string
}

/**
 * Represents the raw fields of a FlowX Pool Sui object.
 * This interface matches the exact structure returned from Sui blockchain.
 */
export interface FlowxSuiObjectPoolFields {
    /** Coin type X. */
    coin_type_x: TypeName
    /** Coin type Y. */
    coin_type_y: TypeName
    /** Fee growth global X (u128 as string). */
    fee_growth_global_x: string
    /** Fee growth global Y (u128 as string). */
    fee_growth_global_y: string
    /** Pool object ID. */
    id: SuiObjectID
    /** Liquidity amount (u128 as string). */
    liquidity: string
    /** Whether the pool is locked. */
    locked: boolean
    /** Max liquidity per tick (u128 as string). */
    max_liquidity_per_tick: string
    /** Observation cardinality (u16 as string). */
    observation_cardinality: string
    /** Observation cardinality next (u16 as string). */
    observation_cardinality_next: string
    /** Observation index (u16 as string). */
    observation_index: string
    /** Array of observations. */
    observations: Array<FlowxSuiObjectPoolObservation>
    /** Protocol fee rate (u64 as string). */
    protocol_fee_rate: string
    /** Protocol fee X (u64 as string). */
    protocol_fee_x: string
    /** Protocol fee Y (u64 as string). */
    protocol_fee_y: string
    /** Reserve X (u64 as string). */
    reserve_x: string
    /** Reserve Y (u64 as string). */
    reserve_y: string
    /** Array of reward information. */
    reward_infos: Array<FlowxSuiObjectPoolRewardInfo>
    /** Square root price (u128 as string). */
    sqrt_price: string
    /** Swap fee rate (u64 as string). */
    swap_fee_rate: string
    /** Tick bitmap table. */
    tick_bitmap: SuiObjectTable<`${string}::i32::I32`, "u256">
    /** Current tick index (i32). */
    tick_index: SuiObjectI32
    /** Tick spacing. */
    tick_spacing: number
    /** Ticks table. */
    ticks: SuiObjectTable<`${string}::i32::I32`, `${string}::tick::TickInfo`>
}

/**
 * Type alias for FlowX Pool Sui object.
 */
export type FlowxSuiObjectPool = SuiObject<
    FlowxSuiObjectPoolFields,
    `${string}::pool::Pool`
>

/**
 * Parsed FlowX pool interface with normalized field names and BN types.
 */
export interface FlowxPool {
    /** Coin type X. */
    coinTypeX: string
    /** Coin type Y. */
    coinTypeY: string
    /** Fee growth global X. */
    feeGrowthGlobalX: BN
    /** Fee growth global Y. */
    feeGrowthGlobalY: BN
    /** Pool ID. */
    id: string
    /** Liquidity amount. */
    liquidity: BN
    /** Whether the pool is locked. */
    locked: boolean
    /** Max liquidity per tick. */
    maxLiquidityPerTick: BN
    /** Observation cardinality. */
    observationCardinality: BN
    /** Observation cardinality next. */
    observationCardinalityNext: BN
    /** Observation index. */
    observationIndex: BN
    /** Array of observations. */
    observations: Array<{
        /** Whether the observation is initialized. */
        initialized: boolean
        /** Seconds per liquidity cumulative. */
        secondsPerLiquidityCumulative: BN
        /** Tick cumulative. */
        tickCumulative: BN
        /** Timestamp in seconds. */
        timestampS: BN
    }>
    /** Protocol fee rate. */
    protocolFeeRate: BN
    /** Protocol fee X. */
    protocolFeeX: BN
    /** Protocol fee Y. */
    protocolFeeY: BN
    /** Reserve X. */
    reserveX: BN
    /** Reserve Y. */
    reserveY: BN
    /** Array of reward information. */
    rewardInfos: Array<{
        /** Ended at seconds. */
        endedAtSeconds: BN
        /** Last update time. */
        lastUpdateTime: BN
        /** Reward coin type. */
        rewardCoinType: string
        /** Reward growth global. */
        rewardGrowthGlobal: BN
        /** Reward per seconds. */
        rewardPerSeconds: BN
        /** Total reward. */
        totalReward: BN
        /** Total reward allocated. */
        totalRewardAllocated: BN
    }>
    /** Square root price. */
    sqrtPrice: BN
    /** Swap fee rate. */
    swapFeeRate: BN
    /** Tick bitmap information. */
    tickBitmap: {
        /** Bitmap table ID. */
        id: string
        /** Bitmap table size. */
        size: BN
    }
    /** Current tick index. */
    tickIndex: BN
    /** Tick spacing. */
    tickSpacing: number
    /** Ticks table information. */
    ticks: {
        /** Ticks table ID. */
        id: string
        /** Ticks table size. */
        size: BN
    }
}

/**
 * Parses a FlowX Pool Sui object into a normalized FlowxPool interface.
 *
 * @param target - The raw FlowX pool fields from Sui object
 * @returns Parsed pool with normalized field names and BN types
 *
 * @example
 * const pool = parseFlowxPool(suiObject.content.fields)
 */
export const parseFlowxPool = (target: FlowxSuiObjectPoolFields): FlowxPool => {
    return {
        coinTypeX: target.coin_type_x.fields.name,
        coinTypeY: target.coin_type_y.fields.name,
        feeGrowthGlobalX: new BN(target.fee_growth_global_x),
        feeGrowthGlobalY: new BN(target.fee_growth_global_y),
        id: target.id.id,
        liquidity: new BN(target.liquidity),
        locked: target.locked,
        maxLiquidityPerTick: new BN(target.max_liquidity_per_tick),
        observationCardinality: new BN(target.observation_cardinality),
        observationCardinalityNext: new BN(target.observation_cardinality_next),
        observationIndex: new BN(target.observation_index),
        observations: target.observations.map((obs) => ({
            initialized: obs.fields.initialized,
            secondsPerLiquidityCumulative: new BN(obs.fields.seconds_per_liquidity_cumulative),
            tickCumulative: parseSuiI64(obs.fields.tick_cumulative),
            timestampS: new BN(obs.fields.timestamp_s),
        })),
        protocolFeeRate: new BN(target.protocol_fee_rate),
        protocolFeeX: new BN(target.protocol_fee_x),
        protocolFeeY: new BN(target.protocol_fee_y),
        reserveX: new BN(target.reserve_x),
        reserveY: new BN(target.reserve_y),
        rewardInfos: target.reward_infos.map((reward) => ({
            endedAtSeconds: new BN(reward.fields.ended_at_seconds),
            lastUpdateTime: new BN(reward.fields.last_update_time),
            rewardCoinType: reward.fields.reward_coin_type.fields.name,
            rewardGrowthGlobal: new BN(reward.fields.reward_growth_global),
            rewardPerSeconds: new BN(reward.fields.reward_per_seconds),
            totalReward: new BN(reward.fields.total_reward),
            totalRewardAllocated: new BN(reward.fields.total_reward_allocated),
        })),
        sqrtPrice: new BN(target.sqrt_price),
        swapFeeRate: new BN(target.swap_fee_rate),
        tickBitmap: {
            id: target.tick_bitmap.fields.id.id,
            size: new BN(target.tick_bitmap.fields.size),
        },
        tickIndex: parseSuiI32(target.tick_index),
        tickSpacing: target.tick_spacing,
        ticks: {
            id: target.ticks.fields.id.id,
            size: new BN(target.ticks.fields.size),
        },
    }
}

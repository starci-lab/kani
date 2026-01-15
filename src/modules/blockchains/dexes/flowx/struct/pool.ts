import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    SuiObjectI64,
    TypeName,
    SuiObjectTable,
    parseSuiI32,
    parseSuiI64,
} from "../../../structs"

// ========== Observation Types ==========
export interface FlowxSuiObjectPoolObservation {
    fields: {
        initialized: boolean
        seconds_per_liquidity_cumulative: string
        tick_cumulative: SuiObjectI64
        timestamp_s: string
    }
    type: string // ::oracle::Observation
}

// ========== Reward Info Types ==========
export interface FlowxSuiObjectPoolRewardInfo {
    fields: {
        ended_at_seconds: string
        last_update_time: string
        reward_coin_type: TypeName
        reward_growth_global: string
        reward_per_seconds: string
        total_reward: string
        total_reward_allocated: string
    }
    type: string // ::pool::PoolRewardInfo
}

// ========== RAW POOL STRUCT ==========
export interface FlowxSuiObjectPoolFields {
    coin_type_x: TypeName
    coin_type_y: TypeName
    fee_growth_global_x: string
    fee_growth_global_y: string
    id: SuiObjectID
    liquidity: string
    locked: boolean
    max_liquidity_per_tick: string
    observation_cardinality: string
    observation_cardinality_next: string
    observation_index: string
    observations: Array<FlowxSuiObjectPoolObservation>
    protocol_fee_rate: string
    protocol_fee_x: string
    protocol_fee_y: string
    reserve_x: string
    reserve_y: string
    reward_infos: Array<FlowxSuiObjectPoolRewardInfo>
    sqrt_price: string
    swap_fee_rate: string
    tick_bitmap: SuiObjectTable<`${string}::i32::I32`, "u256">
    tick_index: SuiObjectI32
    tick_spacing: number
    ticks: SuiObjectTable<`${string}::i32::I32`, `${string}::tick::TickInfo`>
}

export type FlowxSuiObjectPool = SuiObject<
    FlowxSuiObjectPoolFields,
    `${string}::pool::Pool`
>

// ========== PARSED POOL INTERFACE ==========
export interface FlowxPool {
    coinTypeX: string
    coinTypeY: string
    feeGrowthGlobalX: BN
    feeGrowthGlobalY: BN
    id: string
    liquidity: BN
    locked: boolean
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
    protocolFeeRate: BN
    protocolFeeX: BN
    protocolFeeY: BN
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
    tickBitmap: {
        id: string
        size: BN
    }
    tickIndex: BN
    tickSpacing: number
    ticks: {
        id: string
        size: BN
    }
}

// ========== PARSER FUNCTION ==========
/**
 * Parses a FlowX Pool Sui object into a FlowxPool interface
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

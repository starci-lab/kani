/** ========== GENERIC STRUCTS ========== */

import { parseI32 } from "@utils"

export interface SuiObjectID {
    id: string;
}

export interface SuiObjectI32 {
    type: string;
    fields: {
        bits: number;
    };
}

export interface SuiObjectI64 {
    type: string;
    fields: {
        bits: string;
    };
}

export interface TypeName {
    type: string;
    fields: {
        name: string;
    };
}

/** ========== OBSERVATION ========== */

export interface PoolObservation {
    type: string;
    fields: {
        initialized: boolean;
        seconds_per_liquidity_cumulative: string;
        tick_cumulative: SuiObjectI64;
        timestamp_s: string;
    };
}

export interface Observation {
    initialized: boolean;
    secondsPerLiquidityCumulative: string;
    tickCumulative: number;
    timestamp: number;
}

/** ========== REWARD INFO ========== */

export interface PoolRewardInfo {
    type: string;
    fields: {
        ended_at_seconds: string;
        last_update_time: string;
        reward_coin_type: TypeName;
        reward_growth_global: string;
        reward_per_seconds: string;
        total_reward: string;
        total_reward_allocated: string;
    };
}

export interface RewardInfo {
    endedAtSeconds: number;
    lastUpdateTime: number;
    rewardCoinType: string;
    rewardGrowthGlobal: string;
    rewardPerSeconds: string;
    totalReward: string;
    totalRewardAllocated: string;
}

/** ========== RAW POOL STRUCT (SuiObjectPool) ========== */

export interface SuiObjectPool {
    coin_type_x: TypeName;
    coin_type_y: TypeName;

    fee_growth_global_x: string;
    fee_growth_global_y: string;

    id: SuiObjectID;

    liquidity: string;
    locked: boolean;
    max_liquidity_per_tick: string;

    observation_cardinality: string;
    observation_cardinality_next: string;
    observation_index: string;
    observations: Array<PoolObservation>;

    protocol_fee_rate: string;
    protocol_fee_x: string;
    protocol_fee_y: string;

    reserve_x: string;
    reserve_y: string;

    reward_infos: Array<PoolRewardInfo>;

    sqrt_price: string;
    swap_fee_rate: string;

    tick_index: SuiObjectI32;

    tick_spacing: number;
}

/** ========== PARSED POOL STRUCT ========== */

export interface Pool {
    coinTypeX: string;
    coinTypeY: string;

    feeGrowthGlobalX: string;
    feeGrowthGlobalY: string;

    id: string;

    liquidity: string;
    locked: boolean;
    maxLiquidityPerTick: string;

    observationCardinality: number;
    observationCardinalityNext: number;
    observationIndex: number;

    observations: Array<Observation>;

    protocolFeeRate: string;
    protocolFeeX: string;
    protocolFeeY: string;

    reserveX: string;
    reserveY: string;

    rewardInfos: Array<RewardInfo>;

    sqrtPrice: string;
    swapFeeRate: string;

    tickIndex: number;
    tickSpacing: number;
}

/** ========== PARSER ========== */

export const parseSuiPoolObject = (raw: SuiObjectPool): Pool => {
    return {
        coinTypeX: raw.coin_type_x.fields.name,
        coinTypeY: raw.coin_type_y.fields.name,
        feeGrowthGlobalX: raw.fee_growth_global_x,
        feeGrowthGlobalY: raw.fee_growth_global_y,
        id: raw.id.id,
        liquidity: raw.liquidity,
        locked: raw.locked,
        maxLiquidityPerTick: raw.max_liquidity_per_tick,
        observationCardinality: Number(raw.observation_cardinality),
        observationCardinalityNext: Number(raw.observation_cardinality_next),
        observationIndex: Number(raw.observation_index),
        observations: raw.observations.map((obs) => ({
            initialized: obs.fields.initialized,
            secondsPerLiquidityCumulative: obs.fields.seconds_per_liquidity_cumulative,
            tickCumulative: Number(obs.fields.tick_cumulative.fields.bits),
            timestamp: Number(obs.fields.timestamp_s),
        })),
        protocolFeeRate: raw.protocol_fee_rate,
        protocolFeeX: raw.protocol_fee_x,
        protocolFeeY: raw.protocol_fee_y,
        reserveX: raw.reserve_x,
        reserveY: raw.reserve_y,
        rewardInfos: raw.reward_infos.map((info) => ({
            endedAtSeconds: Number(info.fields.ended_at_seconds),
            lastUpdateTime: Number(info.fields.last_update_time),
            rewardCoinType: info.fields.reward_coin_type.fields.name,
            rewardGrowthGlobal: info.fields.reward_growth_global,
            rewardPerSeconds: info.fields.reward_per_seconds,
            totalReward: info.fields.total_reward,
            totalRewardAllocated: info.fields.total_reward_allocated,
        })),
        sqrtPrice: raw.sqrt_price,
        swapFeeRate: raw.swap_fee_rate,
        tickIndex: parseI32(raw.tick_index.fields.bits),
        tickSpacing: raw.tick_spacing,
    }
}

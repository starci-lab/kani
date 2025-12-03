/** ---------- GENERIC STRUCTS ---------- */

import { parseI32 } from "@utils"

export interface SuiObjectID {
    id: string;
}

export interface SuiObjectI32 {
    type: string;
    fields: { bits: number };
}

export interface SuiObjectI64 {
    type: string;
    fields: { bits: string };
}

export interface TypeName {
    type: string;
    fields: { name: string };
}
/** ---------- OBSERVATION ---------- */

export interface SuiObjectPoolObservation {
    type: string; // oracle::Observation
    fields: {
        initialized: boolean;
        seconds_per_liquidity_cumulative: string;
        tick_cumulative: SuiObjectI64;
        timestamp_s: string;
    };
}

/** ---------- REWARD INFO ---------- */

export interface SuiObjectPoolRewardInfo {
    type: string; // pool::PoolRewardInfo
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

/** ---------- ROOT POOL INTERFACE ---------- */

export interface SuiObjectPool {
    fee_growth_global_x: string;
    fee_growth_global_y: string;
    flash_loan_fee_rate: string;
    id: SuiObjectID;
    liquidity: string;
    max_liquidity_per_tick: string;
    observation_cardinality: string;
    observation_cardinality_next: string;
    observation_index: string;
    observations: Array<SuiObjectPoolObservation>;
    protocol_fee_share: string;
    protocol_fee_x: string;
    protocol_fee_y: string;
    protocol_flash_loan_fee_share: string;
    reserve_x: string;
    reserve_y: string;
    reward_infos: Array<SuiObjectPoolRewardInfo>;
    sqrt_price: string;
    swap_fee_rate: string;
    tick_index: SuiObjectI32;
    tick_spacing: number;
    type_x: TypeName;
    type_y: TypeName;
}

export interface PoolObservation {
    type: string;
    fields: {
        initialized: boolean;
        secondsPerLiquidityCumulative: string;
        tickCumulative: SuiObjectI64;
        timestampS: string;
    };
}

/** ---------- REWARD INFO ---------- */

export interface PoolRewardInfo {
    type: string;
    fields: {
        endedAtSeconds: string;
        lastUpdateTime: string;
        rewardCoinType: TypeName;
        rewardGrowthGlobal: string;
        rewardPerSeconds: string;
        totalReward: string;
        totalRewardAllocated: string;
    };
}

/** ---------- ROOT POOL INTERFACE ---------- */

export interface Pool {
    feeGrowthGlobalX: string;
    feeGrowthGlobalY: string;
    flashLoanFeeRate: string;
    id: SuiObjectID;
    liquidity: string;
    maxLiquidityPerTick: string;
    observationCardinality: string;
    observationCardinalityNext: string;
    observationIndex: string;
    observations: Array<PoolObservation>;
    protocolFeeShare: string;
    protocolFeeX: string;
    protocolFeeY: string;
    protocolFlashLoanFeeShare: string;
    reserveX: string;
    reserveY: string;
    rewardInfos: Array<PoolRewardInfo>;
    sqrtPrice: string;
    swapFeeRate: string;
    tickIndex: number;
    tickSpacing: number;
    typeX: TypeName;
    typeY: TypeName;
}

export const parseSuiPoolObject = (raw: SuiObjectPool): Pool => {
    return {
        feeGrowthGlobalX: raw.fee_growth_global_x,
        feeGrowthGlobalY: raw.fee_growth_global_y,
        flashLoanFeeRate: raw.flash_loan_fee_rate,
        id: raw.id,
        liquidity: raw.liquidity,
        maxLiquidityPerTick: raw.max_liquidity_per_tick,
        observationCardinality: raw.observation_cardinality,
        observationCardinalityNext: raw.observation_cardinality_next,
        observationIndex: raw.observation_index,
        observations: raw.observations.map((observation) => ({
            initialized: observation.fields.initialized,
            secondsPerLiquidityCumulative: observation.fields.seconds_per_liquidity_cumulative,
            tickCumulative: observation.fields.tick_cumulative,
            timestampS: observation.fields.timestamp_s,
            fields: {
                initialized: observation.fields.initialized,
                secondsPerLiquidityCumulative: observation.fields.seconds_per_liquidity_cumulative,
                tickCumulative: observation.fields.tick_cumulative,
                timestampS: observation.fields.timestamp_s,
            },
            type: observation.type,
        })),
        protocolFeeShare: raw.protocol_fee_share,
        protocolFeeX: raw.protocol_fee_x,
        protocolFeeY: raw.protocol_fee_y,
        protocolFlashLoanFeeShare: raw.protocol_flash_loan_fee_share,
        reserveX: raw.reserve_x,
        reserveY: raw.reserve_y,
        rewardInfos: raw.reward_infos.map((rewardInfo) => ({
            endedAtSeconds: rewardInfo.fields.ended_at_seconds,
            lastUpdateTime: rewardInfo.fields.last_update_time,
            rewardCoinType: rewardInfo.fields.reward_coin_type,
            rewardGrowthGlobal: rewardInfo.fields.reward_growth_global,
            rewardPerSeconds: rewardInfo.fields.reward_per_seconds,
            totalReward: rewardInfo.fields.total_reward,
            totalRewardAllocated: rewardInfo.fields.total_reward_allocated,
            fields: {
                endedAtSeconds: rewardInfo.fields.ended_at_seconds,
                lastUpdateTime: rewardInfo.fields.last_update_time,
                rewardCoinType: rewardInfo.fields.reward_coin_type,
                rewardGrowthGlobal: rewardInfo.fields.reward_growth_global,
                rewardPerSeconds: rewardInfo.fields.reward_per_seconds,
                totalReward: rewardInfo.fields.total_reward,
                totalRewardAllocated: rewardInfo.fields.total_reward_allocated,
            },
            type: rewardInfo.type,
        })),
        sqrtPrice: raw.sqrt_price,
        swapFeeRate: raw.swap_fee_rate,
        tickIndex: parseI32(raw.tick_index.fields.bits),
        tickSpacing: raw.tick_spacing,
        typeX: raw.type_x,
        typeY: raw.type_y,
    }
}
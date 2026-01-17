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

/** ---------- OBSERVATION ---------- */

export interface MomentumSuiObjectPoolObservation {
    type: string // oracle::Observation
    fields: {
        initialized: boolean
        seconds_per_liquidity_cumulative: string
        tick_cumulative: SuiObjectI64
        timestamp_s: string
    }
}

/** ---------- REWARD INFO ---------- */

export interface MomentumSuiObjectPoolRewardInfo {
    type: string
    fields: {
        ended_at_seconds: string
        last_update_time: string
        reward_coin_type: TypeName
        reward_growth_global: string
        reward_per_seconds: string
        total_reward: string
        total_reward_allocated: string
    }
}

/** ---------- ROOT POOL INTERFACE ---------- */

export interface MomentumSuiObjectPoolFields {
    fee_growth_global_x: string
    fee_growth_global_y: string
    flash_loan_fee_rate: string
    id: SuiObjectID
    liquidity: string
    max_liquidity_per_tick: string
    observation_cardinality: string
    observation_cardinality_next: string
    observation_index: string
    observations: Array<MomentumSuiObjectPoolObservation>
    protocol_fee_share: string
    protocol_fee_x: string
    protocol_fee_y: string
    protocol_flash_loan_fee_share: string
    reserve_x: string
    reserve_y: string
    reward_infos: Array<MomentumSuiObjectPoolRewardInfo>
    sqrt_price: string
    swap_fee_rate: string
    tick_index: SuiObjectI32
    tick_spacing: number
    type_x: TypeName
    type_y: TypeName
}

export type MomentumSuiObjectPool = SuiObject<
    MomentumSuiObjectPoolFields,
    `${string}::pool::Pool`
>

// ========== PARSED POOL INTERFACE ==========
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

// ========== PARSER FUNCTION ==========
/**
 * Parses a Momentum Pool Sui object into a MomentumPool interface
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

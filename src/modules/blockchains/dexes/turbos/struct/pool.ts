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

/** ========== REWARD INFO RAW ========== */

export interface SuiObjectRewardInfo {
    type: string;
    fields: {
        emissions_per_second: string;
        growth_global: string;
        id: SuiObjectID;
        manager: string;
        vault: string;
        vault_coin_type: string;
    };
}

/** ========== RAW POOL STRUCT (FROM RPC) ========== */

export interface SuiObjectPool {
    coin_a: string;
    coin_b: string;

    deploy_time_ms: string;

    fee: number;

    fee_growth_global_a: string;
    fee_growth_global_b: string;

    fee_protocol: number;

    id: SuiObjectID;

    liquidity: string;
    max_liquidity_per_tick: string;

    protocol_fees_a: string;
    protocol_fees_b: string;

    reward_infos: Array<SuiObjectRewardInfo>;

    reward_last_updated_time_ms: string;

    sqrt_price: string;

    tick_current_index: SuiObjectI32;

    tick_spacing: number;

    unlocked: boolean;
}

/** ========== PARSED REWARD INFO ========== */

export interface RewardInfo {
    emissionsPerSecond: string;
    growthGlobal: string;
    rewardId: string;
    manager: string;
    vault: string;
    vaultCoinType: string;
}

/** ========== PARSED POOL STRUCT =========== */

export interface Pool {
    coinA: string;
    coinB: string;

    deployTimeMs: number;

    fee: number;

    feeGrowthGlobalA: string;
    feeGrowthGlobalB: string;

    feeProtocol: number;

    id: string;

    liquidity: string;
    maxLiquidityPerTick: string;

    protocolFeesA: string;
    protocolFeesB: string;

    rewardInfos: Array<RewardInfo>;

    rewardLastUpdatedTimeMs: number;

    sqrtPrice: string;

    tickCurrentIndex: number;

    tickSpacing: number;

    unlocked: boolean;
}

/** ========== PARSER ========== */

export const parseSuiPoolObject = (raw: SuiObjectPool): Pool => {
    return {
        coinA: raw.coin_a,
        coinB: raw.coin_b,

        deployTimeMs: Number(raw.deploy_time_ms),

        fee: raw.fee,

        feeGrowthGlobalA: raw.fee_growth_global_a,
        feeGrowthGlobalB: raw.fee_growth_global_b,

        feeProtocol: raw.fee_protocol,

        id: raw.id.id,

        liquidity: raw.liquidity,
        maxLiquidityPerTick: raw.max_liquidity_per_tick,

        protocolFeesA: raw.protocol_fees_a,
        protocolFeesB: raw.protocol_fees_b,

        rewardInfos: raw.reward_infos.map((r) => ({
            emissionsPerSecond: r.fields.emissions_per_second,
            growthGlobal: r.fields.growth_global,
            rewardId: r.fields.id.id,
            manager: r.fields.manager,
            vault: r.fields.vault,
            vaultCoinType: r.fields.vault_coin_type,
        })),

        rewardLastUpdatedTimeMs: Number(raw.reward_last_updated_time_ms),

        sqrtPrice: raw.sqrt_price,

        tickCurrentIndex: parseI32(raw.tick_current_index.fields.bits),

        tickSpacing: raw.tick_spacing,

        unlocked: raw.unlocked,
    }
}
import { parseI32 } from "@utils"
/** ========== POOL OBJECT ROOT ========== */

export interface SuiObjectPool {
    coin_a: string;
    coin_b: string;
    current_sqrt_price: string;

    current_tick_index: SuiObjectI32;

    fee_growth_global_a: string;
    fee_growth_global_b: string;
    fee_protocol_coin_a: string;
    fee_protocol_coin_b: string;
    fee_rate: string;

    id: SuiObjectID;
    index: string;
    is_pause: boolean;
    liquidity: string;

    position_manager: SuiObjectPositionManager;
    rewarder_manager: SuiObjectRewarderManager;
    tick_manager: SuiObjectTickManager;

    tick_spacing: number;
    url: string;
}

/** ========== GENERIC STRUCTS ========== */

export interface SuiObjectID {
    id: string;
}

export interface SuiObjectI32 {
    type: string;
    fields: {
        bits: number;
    };
}

/** ========== POSITION MANAGER ========== */

export interface SuiObjectPositionManager {
    type: string;
    fields: {
        position_index: string;
        positions: SuiObjectLinkedTable;
        tick_spacing: number;
    };
}

export interface SuiObjectLinkedTable {
    type: string;
    fields: {
        head: string;
        id: SuiObjectID;
        size: string;
        tail: string;
    };
}

/** FULL PositionInfo */

export interface SuiObjectPositionInfo {
    type: string;
    fields: {
        index: string;
        liquidity: string;

        fee_growth_inside_a: string;
        fee_growth_inside_b: string;

        rewarder_growth_inside: string;

        tick_lower_index: SuiObjectI32;
        tick_upper_index: SuiObjectI32;

        pool_id: string;

        fee_owed_a: string;
        fee_owed_b: string;

        rewarder_owed: string;
    };
}

/** ========== REWARDER MANAGER ========== */

export interface SuiObjectRewarderManager {
    type: string;
    fields: SuiObjectRewarderManagerFields;
}

export interface SuiObjectRewarderManagerFields {
    last_updated_time: string;
    points_growth_global: string;
    points_released: string;
    rewarders: Array<SuiObjectRewarder>;
}

export interface SuiObjectRewarder {
    type: string;
    fields: {
        emissions_per_second: string;
        growth_global: string;
        reward_coin: {
            type: string;
            fields: {
                name: string; // e.g. CETUS
            };
        };
    };
}

/** ========== TICK MANAGER ========== */

export interface SuiObjectTickManager {
    type: string;
    fields: {
        tick_spacing: number;
        ticks: SuiObjectSkipList;
    };
}

export interface SuiObjectSkipList {
    type: string;
    fields: {
        head: Array<SuiObjectOptionU64>;
        id: SuiObjectID;
        level: string;
        list_p: string;
        max_level: string;
        random: SuiObjectRandom;
        size: string;
        tail: SuiObjectOptionU64;
    };
}

export interface SuiObjectRandom {
    type: string;
    fields: {
        seed: string;
    };
}

export interface SuiObjectOptionU64 {
    type: string;
    fields: {
        is_none: boolean;
        v: string;
    };
}

/** ========== TICK STRUCT ========== */

export interface SuiObjectTick {
    type: string;
    fields: {
        index: SuiObjectI32;
        liquidity_gross: string;
        liquidity_net: string;

        fee_growth_outside_a: string;
        fee_growth_outside_b: string;

        rewarder_growth_outside: string;
    };
}

export interface Pool {
    coinA: string;
    coinB: string;
    currentSqrtPrice: string;
    currentTickIndex: number;
    feeGrowthGlobalA: string;
    feeGrowthGlobalB: string;
    feeProtocolCoinA: string;
    feeProtocolCoinB: string;
    feeRate: string;
    id: string;
    index: number;
    isPause: boolean;
    liquidity: string;
    tickSpacing: number;
    url: string;
    positionManager: PositionManager;
    rewarderManager: RewarderManager;
    tickManager: TickManager;
}

export interface PositionManager {
    positionIndex: number;
    tickSpacing: number;
}

export interface RewarderManager {
    lastUpdatedTime: number;
    pointsGrowthGlobal: string;
    pointsReleased: string;
    rewarders: Array<Rewarder>;
}

export interface Rewarder {
    emissionsPerSecond: string;
    growthGlobal: string;
    rewardCoinName: string;
}

export interface TickManager {
    tickSpacing: number;
    size: number;
}

export const parseSuiPoolObject = (raw: SuiObjectPool): Pool => {
    try {
        return {
            coinA: raw.coin_a,
            coinB: raw.coin_b,
            currentSqrtPrice: raw.current_sqrt_price,
            currentTickIndex: parseI32(raw.current_tick_index.fields.bits),
            feeGrowthGlobalA: raw.fee_growth_global_a,
            feeGrowthGlobalB: raw.fee_growth_global_b,
            feeProtocolCoinA: raw.fee_protocol_coin_a,
            feeProtocolCoinB: raw.fee_protocol_coin_b,
            feeRate: raw.fee_rate,
            id: raw.id.id,
            index: Number(raw.index),
            isPause: raw.is_pause,
            liquidity: raw.liquidity,
            tickSpacing: raw.tick_spacing,
            url: raw.url,
            positionManager: {
                positionIndex: Number(raw.position_manager.fields.position_index),
                tickSpacing: raw.position_manager.fields.tick_spacing,
            },
            rewarderManager: {
                lastUpdatedTime: Number(raw.rewarder_manager.fields.last_updated_time),
                pointsGrowthGlobal: raw.rewarder_manager.fields.points_growth_global,
                pointsReleased: raw.rewarder_manager.fields.points_released,
                rewarders: raw.rewarder_manager.fields.rewarders.map((x) => ({
                    emissionsPerSecond: x.fields.emissions_per_second,
                    growthGlobal: x.fields.growth_global,
                    rewardCoinName: x.fields.reward_coin.fields.name
                })),
            },
            tickManager: {
                tickSpacing: raw.tick_manager.fields.tick_spacing,
                size: Number(raw.tick_manager.fields.ticks.fields.size),
            },
        }
    } catch (error) {
        console.error(error)
        throw error
    }
}
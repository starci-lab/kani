import BN from "bn.js"
import {
    parseSuiI32,
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../structs"

// ========== Position Manager Types ==========
export interface CetusSuiObjectPositionManagerFields {
    position_index: string;
    tick_spacing: number;
    positions: SuiObject<
        {
            head: string;
            tail: string;
            size: string;
            id: SuiObjectID;
        },
        `${string}::linked_table::LinkedTable<${string}, ${string}>`
    >;
}

export type CetusSuiObjectPositionManager = SuiObject<
    CetusSuiObjectPositionManagerFields,
    `${string}::position::PositionManager`
>;

// ========== Rewarder Types ==========
export interface CetusSuiObjectRewarderFields {
    emissions_per_second: string;
    growth_global: string;
    reward_coin: TypeName;
}

export type CetusSuiObjectRewarder = SuiObject<
    CetusSuiObjectRewarderFields,
    `${string}::rewarder::Rewarder`
>;

export interface CetusSuiObjectRewarderManagerFields {
    last_updated_time: string;
    points_growth_global: string;
    points_released: string;
    rewarders: Array<CetusSuiObjectRewarder>;
}

export type CetusSuiObjectRewarderManager = SuiObject<
    CetusSuiObjectRewarderManagerFields,
    `${string}::rewarder::RewarderManager`
>;

// ========== Tick Manager Types ==========
export interface CetusSuiObjectSkipListFields {
    id: SuiObjectID;
    level: string;
    max_level: string;
    list_p: string;
    size: string;
    head: Array<{
        v: string;
        is_none: boolean;
    }>;
    tail: {
        v: string;
        is_none: boolean;
    };
    random: SuiObject<
        {
            seed: string;
        },
        `${string}::random::Random`
    >;
}

export interface CetusSuiObjectTickManagerFields {
    tick_spacing: number;
    ticks: SuiObject<
        CetusSuiObjectSkipListFields,
        `${string}::skip_list::SkipList<${string}::tick::Tick>`
    >;
}

export type CetusSuiObjectTickManager = SuiObject<
    CetusSuiObjectTickManagerFields,
    `${string}::tick::TickManager`
>;

// ========== Pool Types ==========
export interface CetusSuiObjectPoolFields {
    coin_a: string;
    coin_b: string;
    current_sqrt_price: string;
    current_tick_index: SuiObjectI32<`${string}::i32::I32`>;
    fee_growth_global_a: string;
    fee_growth_global_b: string;
    fee_protocol_coin_a: string;
    fee_protocol_coin_b: string;
    fee_rate: string;
    id: SuiObjectID;
    index: string;
    is_pause: boolean;
    liquidity: string;
    position_manager: CetusSuiObjectPositionManager;
    rewarder_manager: CetusSuiObjectRewarderManager;
    tick_manager: CetusSuiObjectTickManager;
    tick_spacing: number;
    url: string;
}

export type CetusSuiObjectPool = SuiObject<
    CetusSuiObjectPoolFields,
    `${string}::pool::Pool`
>;

// ========== Parsed Pool Interface ==========
export interface CetusPool {
    coinA: string;
    coinB: string;
    currentSqrtPrice: BN;
    currentTickIndex: BN;
    feeGrowthGlobalA: BN;
    feeGrowthGlobalB: BN;
    feeProtocolCoinA: BN;
    feeProtocolCoinB: BN;
    feeRate: BN;
    id: string;
    index: string;
    isPause: boolean;
    liquidity: BN;
    positionManager: {
        positionIndex: string;
        tickSpacing: number;
        positions: {
            head: string;
            tail: string;
            size: string;
            id: string;
        };
    };
    rewarderManager: {
        lastUpdatedTime: BN;
        pointsGrowthGlobal: BN;
        pointsReleased: BN;
        rewarders: Array<{
            emissionsPerSecond: BN;
            growthGlobal: BN;
            rewardCoin: string;
        }>;
    };
    tickManager: {
        tickSpacing: number;
        ticks: {
            id: string;
            level: string;
            maxLevel: string;
            listP: string;
            size: string;
            head: Array<{
                v: string;
                isNone: boolean;
            }>;
            tail: {
                v: string;
                isNone: boolean;
            };
            random: {
                seed: string;
            };
        };
    };
    tickSpacing: number;
    url: string;
}

// ========== Parser Functions ==========
/**
 * Parses a Cetus Pool Sui object into a CetusPool interface
 */
export const parseCetusPool = (target: CetusSuiObjectPoolFields): CetusPool => {
    return {
        coinA: target.coin_a,
        coinB: target.coin_b,
        currentSqrtPrice: new BN(target.current_sqrt_price),
        currentTickIndex: parseSuiI32(target.current_tick_index),
        feeGrowthGlobalA: new BN(target.fee_growth_global_a),
        feeGrowthGlobalB: new BN(target.fee_growth_global_b),
        feeProtocolCoinA: new BN(target.fee_protocol_coin_a),
        feeProtocolCoinB: new BN(target.fee_protocol_coin_b),
        feeRate: new BN(target.fee_rate),
        id: target.id.id,
        index: target.index,
        isPause: target.is_pause,
        liquidity: new BN(target.liquidity),
        positionManager: {
            positionIndex: target.position_manager.fields.position_index,
            tickSpacing: target.position_manager.fields.tick_spacing,
            positions: {
                head: target.position_manager.fields.positions.fields.head,
                tail: target.position_manager.fields.positions.fields.tail,
                size: target.position_manager.fields.positions.fields.size,
                id: target.position_manager.fields.positions.fields.id.id,
            },
        },
        rewarderManager: {
            lastUpdatedTime: new BN(target.rewarder_manager.fields.last_updated_time),
            pointsGrowthGlobal: new BN(target.rewarder_manager.fields.points_growth_global),
            pointsReleased: new BN(target.rewarder_manager.fields.points_released),
            rewarders: target.rewarder_manager.fields.rewarders.map((rewarder) => ({
                emissionsPerSecond: new BN(rewarder.fields.emissions_per_second),
                growthGlobal: new BN(rewarder.fields.growth_global),
                rewardCoin: rewarder.fields.reward_coin.fields.name,
            })),
        },
        tickManager: {
            tickSpacing: target.tick_manager.fields.tick_spacing,
            ticks: {
                id: target.tick_manager.fields.ticks.fields.id.id,
                level: target.tick_manager.fields.ticks.fields.level,
                maxLevel: target.tick_manager.fields.ticks.fields.max_level,
                listP: target.tick_manager.fields.ticks.fields.list_p,
                size: target.tick_manager.fields.ticks.fields.size,
                head: target.tick_manager.fields.ticks.fields.head.map((item) => ({
                    v: item.v,
                    isNone: item.is_none,
                })),
                tail: {
                    v: target.tick_manager.fields.ticks.fields.tail.v,
                    isNone: target.tick_manager.fields.ticks.fields.tail.is_none,
                },
                random: {
                    seed: target.tick_manager.fields.ticks.fields.random.fields.seed,
                },
            },
        },
        tickSpacing: target.tick_spacing,
        url: target.url,
    }
}

import BN from "bn.js"
import {
    parseSuiI32,
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../structs"

/**
 * Fields structure for Cetus position manager Sui object.
 * Manages positions in a pool.
 */
export interface CetusSuiObjectPositionManagerFields {
    /** Position index. */
    position_index: string
    /** Tick spacing. */
    tick_spacing: number
    /** Linked table of positions. */
    positions: SuiObject<
        {
            /** Head of the linked table. */
            head: string
            /** Tail of the linked table. */
            tail: string
            /** Size of the linked table. */
            size: string
            /** Object ID. */
            id: SuiObjectID
        },
        `${string}::linked_table::LinkedTable<${string}, ${string}>`
    >
}

/**
 * Cetus position manager Sui object type.
 */
export type CetusSuiObjectPositionManager = SuiObject<
    CetusSuiObjectPositionManagerFields,
    `${string}::position::PositionManager`
>

/**
 * Fields structure for Cetus rewarder Sui object.
 * Represents a reward mechanism for a pool.
 */
export interface CetusSuiObjectRewarderFields {
    /** Emissions per second. */
    emissions_per_second: string
    /** Global growth value. */
    growth_global: string
    /** Reward coin type. */
    reward_coin: TypeName
}

/**
 * Cetus rewarder Sui object type.
 */
export type CetusSuiObjectRewarder = SuiObject<
    CetusSuiObjectRewarderFields,
    `${string}::rewarder::Rewarder`
>

/**
 * Fields structure for Cetus rewarder manager Sui object.
 * Manages multiple rewarders for a pool.
 */
export interface CetusSuiObjectRewarderManagerFields {
    /** Last updated timestamp. */
    last_updated_time: string
    /** Global points growth. */
    points_growth_global: string
    /** Points released. */
    points_released: string
    /** Array of rewarders. */
    rewarders: Array<CetusSuiObjectRewarder>
}

/**
 * Cetus rewarder manager Sui object type.
 */
export type CetusSuiObjectRewarderManager = SuiObject<
    CetusSuiObjectRewarderManagerFields,
    `${string}::rewarder::RewarderManager`
>

/**
 * Fields structure for Cetus skip list Sui object.
 * Used for efficient tick management in a pool.
 */
export interface CetusSuiObjectSkipListFields {
    /** Object ID. */
    id: SuiObjectID
    /** Current level. */
    level: string
    /** Maximum level. */
    max_level: string
    /** List pointer. */
    list_p: string
    /** Size of the skip list. */
    size: string
    /** Array of head nodes. */
    head: Array<{
        /** Value. */
        v: string
        /** Whether the value is none. */
        is_none: boolean
    }>
    /** Tail node. */
    tail: {
        /** Value. */
        v: string
        /** Whether the value is none. */
        is_none: boolean
    }
    /** Random number generator object. */
    random: SuiObject<
        {
            /** Random seed. */
            seed: string
        },
        `${string}::random::Random`
    >
}

/**
 * Fields structure for Cetus tick manager Sui object.
 * Manages ticks in a pool using a skip list.
 */
export interface CetusSuiObjectTickManagerFields {
    /** Tick spacing. */
    tick_spacing: number
    /** Skip list of ticks. */
    ticks: SuiObject<
        CetusSuiObjectSkipListFields,
        `${string}::skip_list::SkipList<${string}::tick::Tick>`
    >
}

/**
 * Cetus tick manager Sui object type.
 */
export type CetusSuiObjectTickManager = SuiObject<
    CetusSuiObjectTickManagerFields,
    `${string}::tick::TickManager`
>

/**
 * Fields structure for Cetus pool Sui object.
 * Represents a complete liquidity pool with all its components.
 */
export interface CetusSuiObjectPoolFields {
    /** Coin type A. */
    coin_a: string
    /** Coin type B. */
    coin_b: string
    /** Current sqrt price. */
    current_sqrt_price: string
    /** Current tick index. */
    current_tick_index: SuiObjectI32<`${string}::i32::I32`>
    /** Global fee growth for token A. */
    fee_growth_global_a: string
    /** Global fee growth for token B. */
    fee_growth_global_b: string
    /** Protocol fee for token A. */
    fee_protocol_coin_a: string
    /** Protocol fee for token B. */
    fee_protocol_coin_b: string
    /** Fee rate. */
    fee_rate: string
    /** Pool object ID. */
    id: SuiObjectID
    /** Pool index. */
    index: string
    /** Whether the pool is paused. */
    is_pause: boolean
    /** Current liquidity. */
    liquidity: string
    /** Position manager. */
    position_manager: CetusSuiObjectPositionManager
    /** Rewarder manager. */
    rewarder_manager: CetusSuiObjectRewarderManager
    /** Tick manager. */
    tick_manager: CetusSuiObjectTickManager
    /** Tick spacing. */
    tick_spacing: number
    /** Pool URL. */
    url: string
}

/**
 * Cetus pool Sui object type.
 */
export type CetusSuiObjectPool = SuiObject<
    CetusSuiObjectPoolFields,
    `${string}::pool::Pool`
>

/**
 * Parsed Cetus pool interface.
 * Contains parsed pool information with converted types and nested structures.
 */
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

/**
 * Parses Cetus pool Sui object fields into a parsed interface.
 *
 * @param target - Raw Sui object fields
 * @returns Parsed pool
 *
 * @example
 * const parsed = parseCetusPool(poolFields)
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

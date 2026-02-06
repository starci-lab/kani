import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../types"
import {
    parseSuiI32,
} from "../../../utils"

/**
 * Fields structure for Cetus position Sui object.
 * Represents a liquidity position in a Cetus pool.
 */
export interface CetusSuiObjectPositionFields {
    /** Coin type A. */
    coin_type_a: TypeName
    /** Coin type B. */
    coin_type_b: TypeName
    /** Position description. */
    description: string
    /** Position object ID. */
    id: SuiObjectID
    /** Position index. */
    index: string
    /** Liquidity amount. */
    liquidity: string
    /** Position name. */
    name: string
    /** Pool address. */
    pool: string
    /** Lower tick index. */
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    /** Upper tick index. */
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
    /** Position URL. */
    url: string
}

/**
 * Cetus position Sui object type.
 */
export type CetusSuiObjectPosition = SuiObject<
    CetusSuiObjectPositionFields,
    `${string}::position::PositionInfo`
>

/**
 * CLMM position interface (raw structure matching Sui object fields).
 * Alias to SuiObjectPositionFields for convenience when accessing raw fields.
 */
export type CetusClmmPosition = CetusSuiObjectPositionFields

/**
 * Parsed Cetus position interface.
 * Contains parsed position information with converted types.
 */
export interface CetusPosition {
    /** Coin type A. */
    coinTypeA: string
    /** Coin type B. */
    coinTypeB: string
    /** Position description. */
    description: string
    /** Position object ID. */
    id: string
    /** Position index. */
    index: string
    /** Liquidity amount. */
    liquidity: BN
    /** Position name. */
    name: string
    /** Pool address. */
    pool: string
    /** Lower tick index. */
    tickLowerIndex: BN
    /** Upper tick index. */
    tickUpperIndex: BN
    /** Position URL. */
    url: string
}

/**
 * Parses Cetus position Sui object fields into a parsed interface.
 *
 * @param target - Raw Sui object fields
 * @returns Parsed position
 *
 * @example
 * const parsed = parseCetusPosition(positionFields)
 */
export const parseCetusPosition = (target: CetusSuiObjectPositionFields): CetusPosition => {
    return {
        coinTypeA: target.coin_type_a.fields.name,
        coinTypeB: target.coin_type_b.fields.name,
        description: target.description,
        id: target.id.id,
        index: target.index,
        liquidity: new BN(target.liquidity),
        name: target.name,
        pool: target.pool,
        tickLowerIndex: parseSuiI32(target.tick_lower_index),
        tickUpperIndex: parseSuiI32(target.tick_upper_index),
        url: target.url,
    }
}

/**
 * Legacy interface for backward compatibility.
 * Use CetusSuiObjectPositionFields instead.
 */
export interface CetusLiquidityPosition {
    /** Coin type A. */
    coin_type_a: TypeName
    /** Coin type B. */
    coin_type_b: TypeName
    /** Position description. */
    description: string
    /** Position object ID. */
    id: SuiObjectID
    /** Position index. */
    index: string
    /** Liquidity amount. */
    liquidity: string
    /** Position name. */
    name: string
    /** Pool address. */
    pool: string
    /** Lower tick index. */
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    /** Upper tick index. */
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
    /** Position URL. */
    url: string
}

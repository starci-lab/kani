import BN from "bn.js"
import {
    parseSuiI32,
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
    TypeName,
} from "../../../structs"

// ========== Position Types ==========
export interface CetusSuiObjectPositionFields {
    coin_type_a: TypeName
    coin_type_b: TypeName
    description: string
    id: SuiObjectID
    index: string
    liquidity: string
    name: string
    pool: string
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
    url: string
}

export type CetusSuiObjectPosition = SuiObject<
    CetusSuiObjectPositionFields,
    `${string}::position::PositionInfo`
>

// ========== CLMM Position Interface (Raw Structure - matches Sui object fields) ==========
// This interface matches the raw Sui object structure for direct field access
// Alias to SuiObjectPositionFields for convenience
export type CetusClmmPosition = CetusSuiObjectPositionFields

// ========== Parsed Position Interface ==========
export interface CetusPosition {
    coinTypeA: string
    coinTypeB: string
    description: string
    id: string
    index: string
    liquidity: BN
    name: string
    pool: string
    tickLowerIndex: BN
    tickUpperIndex: BN
    url: string
}

// ========== Parser Functions ==========
/**
 * Parses a Cetus Position Sui object into a CetusPosition interface
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

// Legacy interface for backward compatibility
export interface CetusLiquidityPosition {
    coin_type_a: TypeName
    coin_type_b: TypeName
    description: string
    id: SuiObjectID
    index: string
    liquidity: string
    name: string
    pool: string
    tick_lower_index: SuiObjectI32<`${string}::i32::I32`>
    tick_upper_index: SuiObjectI32<`${string}::i32::I32`>
    url: string
}

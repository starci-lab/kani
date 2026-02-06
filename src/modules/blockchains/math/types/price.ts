import Decimal from "decimal.js"
import {
    TokenSchema
} from "@modules/databases"

/** Parameters for resolving token price. */
export interface ResolvePriceParams {
    token: TokenSchema
}

/** Result of resolving token price. */
export interface ResolvePriceResult {
    price: Decimal
    isStale: boolean
    /** Milliseconds since the price snapshot was taken. */
    ageMs: number
}

/** Parameters for resolving relative price between two tokens. */
export interface ResolveRelativePriceParams {
    tokenA: TokenSchema
    tokenB: TokenSchema
}

/** Result of resolving relative price. */
export interface ResolveRelativePriceResult {
    /** Relative price: tokenA / tokenB. */
    price: Decimal
    ageMs: number
    isStale: boolean
}

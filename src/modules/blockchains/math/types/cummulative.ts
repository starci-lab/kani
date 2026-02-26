import {
    TokenSchema
} from "@modules/databases"
import Decimal from "decimal.js"

/** Parameters for resolving cummulative price. */
export interface ResolveCummulativePriceParams {
    /** The token to resolve the cummulative price for. */
    token: TokenSchema
    /** The interval in milliseconds. */
    intervalMs: number
}

/** Result for resolving cummulative price. */
export interface ResolveCummulativePriceResult {
    /** The price. */
    price: Decimal
    /** Whether the price data is stale. */
    isStale: boolean
    /** Milliseconds since the price snapshot was taken. */
    ageMs: number
}
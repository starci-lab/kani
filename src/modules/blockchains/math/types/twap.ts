import type {
    TokenSchema,
} from "@modules/databases"
import type Decimal from "decimal.js"

/** Parameters for resolving TWAP price. */
export interface ResolveTwapPriceParams {
    /** The token to resolve the TWAP price for. */
    token: TokenSchema
    /** The window in milliseconds. */
    intervalMs: number
}

/** Result for resolving TWAP price. */
export interface ResolveTwapPriceResult {
    price: Decimal
    isStale: boolean
    ageMs: number
}

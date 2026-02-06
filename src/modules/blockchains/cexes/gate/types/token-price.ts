import {
    TokenId 
} from "@modules/databases"

/**
 * Represents a token price from Gate.io with token identification.
 */
export interface GateTokenPrice {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Token price. */
    price: number
}

/**
 * Raw token price data received from Gate.io API.
 */
export interface GateTokenPriceData {
    /** Trading symbol (e.g., "SOL_USDT"). */
    symbol: string
    /** Token price. */
    price: number
}

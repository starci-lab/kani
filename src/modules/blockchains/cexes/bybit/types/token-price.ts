import {
    TokenId 
} from "@modules/databases"

/**
 * Represents a token price from Bybit with token identification.
 */
export interface BybitTokenPrice {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Token price. */
    price: number
}

/**
 * Raw token price data received from Bybit API.
 */
export interface BybitTokenPriceData {
    /** Trading symbol (e.g., "BTCUSDT"). */
    symbol: string
    /** Token price. */
    price: number
}

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
    /** Trading symbol (e.g. "BTCUSDT"). */
    symbol: string
    /** Token price. */
    price: number
}

/** Params for resolving Bybit token prices. */
export interface ResolveTokenPricesParams {
    /** Token price data from Bybit API. */
    tokenPriceDataArray: Array<BybitTokenPriceData>
}

/** Params for getting token ID by Bybit symbol. */
export interface GetTokenIdBySymbolParams {
    /** Bybit trading symbol. */
    symbol: string
}

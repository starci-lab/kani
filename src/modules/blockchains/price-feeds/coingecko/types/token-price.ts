import {
    TokenId 
} from "@modules/databases"

/**
 * Coingecko token price with token identifier and price information.
 */
export interface CoingeckoTokenPrice {
    /** Token identifier. */
    tokenId: TokenId
    /** Token ID string. */
    id: string
    /** Price value. */
    price: number
}

/**
 * Coingecko token price data from API response.
 */
export interface CoingeckoTokenPriceData {
    /** Coin ID from Coingecko API. */
    coinId: string
    /** Price value. */
    price: number
}

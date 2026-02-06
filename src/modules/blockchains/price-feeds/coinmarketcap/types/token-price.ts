import {
    TokenId 
} from "@modules/databases"

/**
 * CoinMarketCap token price with token identifier and price information.
 */
export interface CoinMarketCapTokenPrice {
    /** Token identifier. */
    tokenId: TokenId
    /** Token ID string. */
    id: string
    /** Price value. */
    price: number
}

/**
 * CoinMarketCap token price data from API response.
 */
export interface CoinMarketCapTokenPriceData {
    /** Symbol from CoinMarketCap API. */
    symbol: string
    /** Price value. */
    price: number
}

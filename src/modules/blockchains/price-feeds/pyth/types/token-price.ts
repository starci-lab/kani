import {
    TokenId 
} from "@modules/databases"

/**
 * Pyth token price with token identifier and price information.
 */
export interface PythTokenPrice {
    /** Token identifier. */
    tokenId: TokenId
    /** Token ID string. */
    id: string
    /** Price value. */
    price: number
}

/**
 * Pyth token price data from API response.
 */
export interface PythTokenPriceData {
    /** Feed ID from Pyth network. */
    feedId: string
    /** Price value. */
    price: number
}

import {
    TokenId 
} from "@modules/databases"

/**
 * Represents a token price from Binance with token identification.
 */
export interface BinanceTokenPrice {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Token price. */
    price: number
}

/**
 * Raw token price data received from Binance API.
 */
export interface BinanceTokenPriceData {
    /** Trading symbol (e.g. "SUIUSDT"). */
    symbol: string
    /** Token price. */
    price: number
}

/** Params for mapping Binance token price data to internal token prices. */
export interface GetBinanceTokenPricesParams {
    /** Token price data from Binance API. */
    tokenPriceDataArray: Array<BinanceTokenPriceData>
}
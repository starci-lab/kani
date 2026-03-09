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

/**
 * Raw token volume data (symbol + quote volume).
 */
export interface BinanceTokenVolumeData {
    /** Trading symbol (e.g. "SUIUSDT"). */
    symbol: string
    /** Quote volume. */
    volume: number
}

/**
 * Token volume with token identification (for writing to volume bucket).
 */
export interface BinanceTokenVolume {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Quote volume. */
    volume: number
}

/** Params for mapping Binance token volume data to internal token volumes. */
export interface GetBinanceTokenVolumesParams {
    /** Token volume data (symbol + volume). */
    tokenVolumeDataArray: Array<BinanceTokenVolumeData>
}
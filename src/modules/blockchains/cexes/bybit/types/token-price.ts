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
export interface ResolveBybitTokenPricesParams {
    /** Token price data from Bybit API. */
    tokenPriceDataArray: Array<BybitTokenPriceData>
}

/** Params for getting token ID by Bybit symbol. */
export interface GetBybitTokenIdBySymbolParams {
    /** Bybit trading symbol. */
    symbol: string
}

/**
 * Raw token volume data (symbol + quote volume).
 */
export interface BybitTokenVolumeData {
    /** Trading symbol (e.g. "BTCUSDT"). */
    symbol: string
    /** Quote volume. */
    volume: number
}

/**
 * Token volume with token identification (for writing to volume bucket).
 */
export interface BybitTokenVolume {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Quote volume. */
    volume: number
}

/** Params for resolving Bybit token volumes. */
export interface ResolveBybitTokenVolumesParams {
    /** Token volume data (symbol + volume). */
    tokenVolumeDataArray: Array<BybitTokenVolumeData>
}

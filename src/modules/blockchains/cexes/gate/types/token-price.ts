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
    /** Trading symbol (e.g. "SOL_USDT"). */
    symbol: string
    /** Token price. */
    price: number
}

/** Params for resolving Gate.io token prices. */
export interface ResolveGateTokenPricesParams {
    /** Token price data from Gate.io API. */
    tokenPriceDataArray: Array<GateTokenPriceData>
}

/**
 * Raw token volume data (symbol + quote volume).
 */
export interface GateTokenVolumeData {
    /** Trading symbol (e.g. "SOL_USDT"). */
    symbol: string
    /** Quote volume. */
    volume: number
}

/**
 * Token volume with token identification (for writing to volume bucket).
 */
export interface GateTokenVolume {
    /** Token display ID. */
    tokenId: TokenId
    /** Token internal ID. */
    id: string
    /** Quote volume. */
    volume: number
}

/** Params for resolving Gate.io token volumes. */
export interface ResolveGateTokenVolumesParams {
    /** Token volume data (symbol + volume). */
    tokenVolumeDataArray: Array<GateTokenVolumeData>
}

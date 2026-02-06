import type {
    DynamicLiquidityPoolInfoCacheResult,
} from "@modules/cache"

/** Single dynamic liquidity pool info in publication payload. */
export type PublicationDynamicLiquidityPoolInfo = DynamicLiquidityPoolInfoCacheResult

/** Event payload for dynamic liquidity pools info publication. */
export interface PublicationDynamicLiquidityPoolsInfoEventPayload {
    results: Record<string, PublicationDynamicLiquidityPoolInfo>
}

/** Single price in publication payload. */
export interface PublicationPrice {
    price: number
}

/** Event payload for price publication. */
export interface PublicationPriceEventPayload {
    results: Record<string, PublicationPrice>
}

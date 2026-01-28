import {
    DynamicLiquidityPoolStateCacheResult 
} from "@modules/cache"

export type PublicationDynamicLiquidityPoolInfo = DynamicLiquidityPoolStateCacheResult

export interface PublicationDynamicLiquidityPoolsInfoEventPayload {
    results: Record<string, PublicationDynamicLiquidityPoolInfo>
}

export interface PublicationPrice {
    price: number
}

export interface PublicationPriceEventPayload {
    results: Record<string, PublicationPrice>
}
import {
    DynamicLiquidityPoolStateCacheResult 
} from "@modules/cache"

export interface PublicationDynamicLiquidityPoolsInfoEventPayload {
    results: Array<DynamicLiquidityPoolStateCacheResult>
}
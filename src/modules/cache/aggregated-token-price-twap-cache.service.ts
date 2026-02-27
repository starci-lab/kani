import {
    Injectable,
} from "@nestjs/common"
import {
    AggregatedTokenPriceTwapNotFoundException,
} from "@modules/exceptions"
import {
    CacheService,
} from "./cache.service"
import {
    CacheKey,
} from "./enums"
import type {
    AggregatedTokenPriceTwapCacheResult,
    SetAggregatedTokenPriceTwapCacheParams,
} from "./types"

/** Service for managing aggregated token price TWAP in cache. */
@Injectable()
export class AggregatedTokenPriceTwapCacheService {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Persists the aggregated token price TWAP snapshot for a token.
     * 
     * @param param - id, cacheResult
     * @param param.id - The id of the aggregated token price TWAP.
     * @param param.cacheResult - The cache result to set.
     * @returns void
     *
     * @example
     * await this.aggregatedTokenPriceTwapCacheService.set({ id, cacheResult })
     */
    async set({
        id,
        cacheResult,
    }: SetAggregatedTokenPriceTwapCacheParams): Promise<void> {
        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPriceTwap,
            args: [id],
            cacheResult,
        })
    }

    /**
     * Gets the aggregated token price TWAP for a token in cache.
     * @param id - The id of the aggregated token price TWAP.
     * @returns The aggregated token price TWAP cache result.
     */
    async get(id: string): Promise<AggregatedTokenPriceTwapCacheResult> {
        const cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceTwap,
            args: [id],
        })
        if (!cacheResult) {
            throw new AggregatedTokenPriceTwapNotFoundException({
                id,
            })
        }
        return cacheResult
    }
}
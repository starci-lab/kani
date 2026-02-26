import {
    Injectable 
} from "@nestjs/common"
import {
    AggregatedTokenPriceCummulativeNotFoundException
} from "@modules/exceptions"
import {
    CacheService 
} from "./cache.service"
import {
    CacheKey 
} from "./enums"
import type {
    AggregatedTokenPriceCummulativeCacheResult,
    SetAggregatedTokenPriceCummulativeCacheParams,
} from "./types"

/** Service for managing aggregated token price cummulative in cache. */
@Injectable()
export class AggregatedTokenPriceCummulativeCacheService {
    constructor(
    private readonly cacheService: CacheService,
    ) {}

    /**
     * Persists the aggregated token price cummulative snapshot for a token.
     */
    async set({
        id,
        cacheResult,
    }: SetAggregatedTokenPriceCummulativeCacheParams): Promise<void> {
        await this.cacheService.set(
            {
                key: CacheKey.AggregatedTokenPriceCummulative,
                args: [id],
                cacheResult,
            }
        )
    }

    /**
     * Gets the aggregated token price cummulative for a market listing in cache.
     * @param id - The id of the aggregated token price cummulative.
     * @returns The aggregated token price cummulative.
     */
    async get(id: string): Promise<AggregatedTokenPriceCummulativeCacheResult> {
        const cacheResult = await this.cacheService.get(
            {
                key: CacheKey.AggregatedTokenPriceCummulative,
                args: [id],
            }
        )
        if (!cacheResult) {
            throw new AggregatedTokenPriceCummulativeNotFoundException({
                id,
            })
        }
        return cacheResult
    }
}
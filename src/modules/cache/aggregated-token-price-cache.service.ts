import {
    Injectable
} from "@nestjs/common"
import {
    AggregatedTokenPriceNotFoundException
} from "@modules/exceptions"
import {
    DayjsService
} from "@modules/mixin"
import {
    CacheKey
} from "./enums"
import {
    AggregatedTokenPriceCacheResult,
    SetAggregatedTokenPriceParams
} from "./types"
import {
    CacheService
} from "./cache.service"

/**
 * Service for reading and writing aggregated token price cache by id.
 *
 * @example
 * await aggregatedTokenPriceCacheService.set({ id, price, marketListingId })
 * const result = await aggregatedTokenPriceCacheService.get(id)
 */
@Injectable()
export class AggregatedTokenPriceCacheService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Sets or updates aggregated token price for a market listing in cache.
     *
     * @param param - Id, price, market listing id
     *
     * @example
     * await service.set({ id: "bot-1", price: 1.5, marketListingId: "listing-1" })
     */
    async set({
        id,
        price,
        marketListingId,
    }: SetAggregatedTokenPriceParams): Promise<void> {
        let cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [id],
        })

        if (!cacheResult) {
            cacheResult = {
                prices: {
                },
                snapshotAt: this.dayjsService.now(),
            } as AggregatedTokenPriceCacheResult
        }

        cacheResult.prices[marketListingId] = {
            price,
            snapshotAt: this.dayjsService.now(),
        }

        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPrice,
            args: [id],
            cacheResult,
        })
    }

    /**
     * Gets aggregated token price cache result by id.
     *
     * @param id - Cache entry id
     * @returns Cached result
     * @throws AggregatedTokenPriceNotFoundException when not found
     *
     * @example
     * const result = await service.get("bot-1")
     */
    async get(id: string): Promise<AggregatedTokenPriceCacheResult> {
        const cachedResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [id],
        })

        if (!cachedResult) {
            throw new AggregatedTokenPriceNotFoundException({
                id 
            })
        }

        return cachedResult
    }
}

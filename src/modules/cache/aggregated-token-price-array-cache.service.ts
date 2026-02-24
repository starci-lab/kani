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
    AggregatedTokenPriceArrayCacheResult,
    PushAggregatedTokenPriceArrayParams
} from "./types"
import {
    CacheService
} from "./cache.service"

/**
 * Service for reading and writing aggregated token price array cache by id.
 *
 * @example
 * await aggregatedTokenPriceArrayCacheService.push({ id, price, marketListingId })
 * const result = await aggregatedTokenPriceArrayCacheService.get(id)
 * const popped = await aggregatedTokenPriceArrayCacheService.pop(id)
 * const replaced = await aggregatedTokenPriceArrayCacheService.replace({ id, price, marketListingId })
 */
@Injectable()
export class AggregatedTokenPriceArrayCacheService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Pushes aggregated token price to the end of the array cache.
     *
     * @param param - Id, price, market listing id
     *
     * @example
     * await service.push({ id: "bot-1", price: 1.5, marketListingId: "listing-1" })
     */
    async push({
        id,
        price,
        marketListingId,
    }: PushAggregatedTokenPriceArrayParams): Promise<void> {
        let cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
        })

        if (!cacheResult) {
            cacheResult = {
                array: [],
                snapshotAt: this.dayjsService.now(),
            } as AggregatedTokenPriceArrayCacheResult
        }

        const newEntry: AggregatedTokenPriceCacheResult = {
            prices: {
                [marketListingId]: {
                    price,
                    snapshotAt: this.dayjsService.now(),
                },
            },
            snapshotAt: this.dayjsService.now(),
        }

        cacheResult.array.push(newEntry)

        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
            cacheResult,
        })
    }

    /**
     * Pops the first aggregated token price from the array cache.
     *
     * @param id - Cache entry id
     * @returns Popped cache result, or undefined if array is empty
     *
     * @example
     * const popped = await service.pop("bot-1")
     */
    async pop(id: string): Promise<AggregatedTokenPriceCacheResult | undefined> {
        const cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
        })

        if (!cacheResult || cacheResult.array.length === 0) {
            return undefined
        }

        const popped = cacheResult.array.shift()

        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
            cacheResult,
        })

        return popped
    }

    /**
     * Replaces the first aggregated token price by popping it and pushing a new one to the end.
     *
     * @param param - Id, price, market listing id
     * @returns Popped cache result, or undefined if array was empty before push
     *
     * @example
     * const replaced = await service.replace({ id: "bot-1", price: 1.5, marketListingId: "listing-1" })
     */
    async replace({
        id,
        price,
        marketListingId,
    }: PushAggregatedTokenPriceArrayParams): Promise<AggregatedTokenPriceCacheResult | undefined> {
        let cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
        })

        if (!cacheResult) {
            cacheResult = {
                array: [],
                snapshotAt: this.dayjsService.now(),
            } as AggregatedTokenPriceArrayCacheResult
        }

        const popped = cacheResult.array.shift()

        const newEntry: AggregatedTokenPriceCacheResult = {
            prices: {
                [marketListingId]: {
                    price,
                    snapshotAt: this.dayjsService.now(),
                },
            },
            snapshotAt: this.dayjsService.now(),
        }

        cacheResult.array.push(newEntry)

        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPriceArray,
            args: [id],
            cacheResult,
        })

        return popped
    }

    /**
     * Gets aggregated token price array cache result by id.
     *
     * @param id - Cache entry id
     * @returns Cached result
     * @throws AggregatedTokenPriceNotFoundException when not found
     *
     * @example
     * const result = await service.get("bot-1")
     */
    async get(id: string): Promise<AggregatedTokenPriceArrayCacheResult> {
        const cachedResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceArray,
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

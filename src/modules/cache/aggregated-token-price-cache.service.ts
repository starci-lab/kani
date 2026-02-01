import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId 
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException 
} from "@modules/exceptions"
import {
    AggregatedTokenPriceCacheResult 
} from "./config"
import {
    CacheService 
} from "./cache.service"
import {
    CacheKey 
} from "./config"
@Injectable()
export class AggregatedTokenPriceCacheService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    async set(
        {
            id,
            price,
            marketListingId,
        }
        : SetAggregatedTokenPriceParams
    ): Promise<void> {
        // try to get the cache result
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
        // update the cache result
        cacheResult.prices[marketListingId] = {
            price: price,
            snapshotAt: this.dayjsService.now(),
        }
        // save the cache result
        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPrice,
            args: [id],
            cacheResult,
        })
    }

    async get(id: string): Promise<AggregatedTokenPriceCacheResult> {
        const cachedResult = await this.cacheService.get(
            {
                key: CacheKey.AggregatedTokenPrice,
                args: [id],
            }
        )
        if (!cachedResult) {
            throw new AggregatedTokenPriceNotFoundException({
                id,
            })
        }
        return cachedResult
    }   
}

export interface SetAggregatedTokenPriceParams {
    id: string
    price: number
    marketListingId: MarketListingId
}
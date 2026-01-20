import {
    Injectable 
} from "@nestjs/common"
import {
    createObjectId
} from "@modules/utils"
import {
    MarketListingId, TokenId 
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
            tokenId,
            price,
            marketListingId,
        }
        : SetAggregatedTokenPriceParams
    ): Promise<void> {
        // try to get the cache result
        let cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [createObjectId(tokenId).toString()],
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
            args: [createObjectId(tokenId).toString()],
            cacheResult,
        })
    }

    async get(tokenId: TokenId): Promise<AggregatedTokenPriceCacheResult> {
        const cachedResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [createObjectId(tokenId).toString()],
        })
        if (!cachedResult) {
            throw new AggregatedTokenPriceNotFoundException({
                tokenId
            })
        }
        return cachedResult
    }   
}

export interface SetAggregatedTokenPriceParams {
    tokenId: TokenId
    price: number
    marketListingId: MarketListingId
}
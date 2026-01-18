import {
    Injectable 
} from "@nestjs/common"
import {
    createObjectId
} from "@utils"
import {
    MarketListingId, TokenId 
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException 
} from "@exceptions"
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
        let cachedResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [createObjectId(tokenId).toString()],
        })
        if (!cachedResult) {
            cachedResult = {
                prices: {
                },
                snapshotAt: this.dayjsService.now(),
            } as AggregatedTokenPriceCacheResult
        }
        // update the cache result
        cachedResult.prices[marketListingId] = {
            price: price,
            snapshotAt: this.dayjsService.now(),
        }
    }

    async get(tokenId: TokenId): Promise<AggregatedTokenPriceCacheResult> {
        const cachedResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPrice,
            args: [createObjectId(tokenId).toString()],
        })
        if (!cachedResult) {
            throw new AggregatedTokenPriceNotFoundException(tokenId)
        }
        return cachedResult
    }   
}

export interface SetAggregatedTokenPriceParams {
    tokenId: TokenId
    price: number
    marketListingId: MarketListingId
}
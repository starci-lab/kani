import { Injectable } from "@nestjs/common"
import { InjectRedisCache } from "./cache.decorators"
import { createCacheKey } from "./utils"
import { MarketId, TokenId } from "@modules/databases"
import { CacheKey } from "./keys"
import { Cache } from "cache-manager"
import { AggregatedTokenPriceCacheResult } from "./keys"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { AggregatedTokenPriceNotFoundException } from "@exceptions"
@Injectable()
export class CachePriceUtilsService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) {}

    async updateAggregatedTokenPrice(
        {
            tokenId,
            price,
            marketId,
        }
        : UpdateAggregatedTokenPriceParams
    ): Promise<void> {
        // try to get the cache result
        const cachedResultString = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.AggregatedTokenPrice, tokenId),
        )
        // if the cache result is not found, set the cache result
        let cachedResult: AggregatedTokenPriceCacheResult | undefined
        if (cachedResultString) {
            cachedResult = this.superjson.parse<AggregatedTokenPriceCacheResult>(cachedResultString)
        } else {
            cachedResult = {
                prices: {},
            } as AggregatedTokenPriceCacheResult
        }
        // update the cache result
        cachedResult.prices[marketId] = {
            price: price,
            snapshotAt: this.dayjsService.now(),
        }
        cachedResult.snapshotAt = this.dayjsService.now()
        // set the cache result
        await this.cacheManager.set(
            createCacheKey(CacheKey.AggregatedTokenPrice, tokenId),
            this.superjson.stringify(cachedResult),
            envConfig().cache.ttl.aggregatedTokenPrice,
        )
    }

    async getAggregatedTokenPrice(tokenId: TokenId): Promise<AggregatedTokenPriceCacheResult> {
        const cachedResult = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.AggregatedTokenPrice, tokenId),
        )
        if (!cachedResult) {
            throw new AggregatedTokenPriceNotFoundException(tokenId)
        }
        return this.superjson.parse<AggregatedTokenPriceCacheResult>(cachedResult)
    }   
}

export interface UpdateAggregatedTokenPriceParams {
    tokenId: TokenId
    price: number
    marketId: MarketId
}
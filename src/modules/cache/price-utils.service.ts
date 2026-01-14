import { Injectable } from "@nestjs/common"
import { InjectRedisCache } from "./cache.decorators"
import { createCacheKey } from "./utils"
import { MarketId, TokenId } from "@modules/databases"
import { CacheKey } from "./keys"
import { Cache } from "cache-manager"
import { OracleTokenPriceCacheResult } from "./keys"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { OracleTokenPriceNotFoundException } from "@exceptions"
@Injectable()
export class CachePriceUtilsService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) {}

    async updateOracleTokenPrice(
        {
            tokenId,
            price,
            marketId,
        }
        : UpdateOracleTokenPriceParams
    ): Promise<void> {
        // try to get the cache result
        const cachedResultString = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.OracleTokenPrice, tokenId),
        )
        // if the cache result is not found, set the cache result
        let cachedResult: OracleTokenPriceCacheResult | undefined
        if (cachedResultString) {
            cachedResult = this.superjson.parse<OracleTokenPriceCacheResult>(cachedResultString)
        } else {
            cachedResult = {
                prices: {},
            } as OracleTokenPriceCacheResult
        }
        // update the cache result
        cachedResult.prices[marketId] = {
            price: price,
            snapshotAt: this.dayjsService.now(),
        }
        cachedResult.snapshotAt = this.dayjsService.now()
        // set the cache result
        await this.cacheManager.set(
            createCacheKey(CacheKey.OracleTokenPrice, tokenId),
            this.superjson.stringify(cachedResult),
            envConfig().cache.ttl.oracleTokenPrice,
        )
    }

    async getOracleTokenPrice(tokenId: TokenId): Promise<OracleTokenPriceCacheResult> {
        const cachedResult = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.OracleTokenPrice, tokenId),
        )
        if (!cachedResult) {
            throw new OracleTokenPriceNotFoundException(tokenId)
        }
        return this.superjson.parse<OracleTokenPriceCacheResult>(cachedResult)
    }   
}

export interface UpdateOracleTokenPriceParams {
    tokenId: TokenId
    price: number
    marketId: MarketId
}
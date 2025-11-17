import { Injectable } from "@nestjs/common"
import { CacheKey, createCacheKey, InjectRedisCache, PythTokenPriceCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { PythTokenPriceNotFoundException } from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { AsyncService } from "@modules/mixin"
import Decimal from "decimal.js"
import { TokenId } from "@modules/databases"
import { Network } from "@typedefs"

@Injectable()
export class OraclePriceService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly asyncService: AsyncService,
    ) {}

    async getOraclePrice(
        { tokenA, tokenB, network }
        : GetOraclePriceParams
    ) {
        const keyA = createCacheKey(CacheKey.PythTokenPrice, tokenA, network)
        const keyB = createCacheKey(CacheKey.PythTokenPrice, tokenB, network)
        const [priceACacheResult, priceBCacheResult] = await this.asyncService.allMustDone([
            this.cacheManager.get<string>(keyA),
            this.cacheManager.get<string>(keyB),
        ])
        if (!priceACacheResult) {
            throw new PythTokenPriceNotFoundException(tokenA, network, "Token A price not found")
        }
        if (!priceBCacheResult) {
            throw new PythTokenPriceNotFoundException(tokenB, network, "Token B price not found")
        }
        const priceA = new Decimal(
            this.superjson.parse<PythTokenPriceCacheResult>(priceACacheResult)?.price ?? 0
        )
        const priceB = new Decimal(
            this.superjson.parse<PythTokenPriceCacheResult>(priceBCacheResult)?.price ?? 0
        )
        return priceA.div(priceB).toNumber()
    }
}

export interface GetOraclePriceParams {
    tokenA: TokenId
    tokenB: TokenId
    network: Network
}
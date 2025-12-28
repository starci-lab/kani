import { Injectable } from "@nestjs/common"
import { 
    CacheKey, 
    createCacheKey, 
    InjectRedisCache, 
    PythTokenPriceCacheResult 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { PythTokenPriceNotFoundException } from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { AsyncService } from "@modules/mixin"
import Decimal from "decimal.js"
import { TokenId } from "@modules/databases"

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
        { 
            tokenA, 
            tokenB
        }
        : GetOraclePriceParams
    ) {
        const keyA = createCacheKey(CacheKey.PythTokenPrice, tokenA)
        const keyB = createCacheKey(CacheKey.PythTokenPrice, tokenB)
        const [
            priceACacheResult, 
            priceBCacheResult
        ] = await this.asyncService.allMustDone(
            [
                this.cacheManager.get<string>(keyA),
                this.cacheManager.get<string>(keyB),
            ])
        if (!priceACacheResult) {
            throw new PythTokenPriceNotFoundException(tokenA) 
        }
        const priceA = new Decimal(
            this.superjson.parse<PythTokenPriceCacheResult>(priceACacheResult)?.price ?? 0
        )
        if (!priceBCacheResult) {
            throw new PythTokenPriceNotFoundException(tokenB)
        }
        const priceB = new Decimal(
            this.superjson.parse<PythTokenPriceCacheResult>(priceBCacheResult)?.price ?? 0
        )
        return priceA.div(priceB)
    }
}

export interface GetOraclePriceParams {
    tokenA: TokenId
    tokenB: TokenId
}
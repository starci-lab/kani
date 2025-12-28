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
import Decimal from "decimal.js"
import { TokenId } from "@modules/databases"

@Injectable()
export class PythPriceService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    async getPrice(
        { 
            tokenId
        }
        : GetPriceParams
    ) {
        const key = createCacheKey(CacheKey.PythTokenPrice, tokenId)
        const priceCacheResult = await this.cacheManager.get<string>(key)
        if (!priceCacheResult) {
            throw new PythTokenPriceNotFoundException(tokenId) 
        }
        const price = new Decimal(
            this.superjson.parse<PythTokenPriceCacheResult>(priceCacheResult)?.price ?? 0
        )
        return price
    }
}

export interface GetPriceParams {
    tokenId: TokenId
}
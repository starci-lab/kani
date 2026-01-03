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
import { Dayjs } from "dayjs"

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
    ): Promise<GetPriceResponse> {
        const key = createCacheKey(CacheKey.PythTokenPrice, tokenId)
        const priceCacheResult = await this.cacheManager.get<string>(key)
        if (!priceCacheResult) {
            throw new PythTokenPriceNotFoundException(tokenId) 
        }
        const cacheResult = this.superjson.parse<PythTokenPriceCacheResult>(priceCacheResult)
        if (!cacheResult) {
            throw new PythTokenPriceNotFoundException(tokenId)
        }
        return {
            price: new Decimal(cacheResult.price),
            snapshotAt: cacheResult.snapshotAt,
        }
    }
}

export interface GetPriceParams {
    tokenId: TokenId
}

export interface GetPriceResponse {
    price: Decimal
    snapshotAt: Dayjs
}
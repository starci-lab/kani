import { Injectable } from "@nestjs/common"
import { 
    CacheKey,
    createCacheKey,
    InjectRedisCache,
    SpotPriceCacheResult, 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { 
    LiquidityPoolId,
    LiquidityPoolType, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { TickMathService } from "../math"
import { 
    InvalidPoolTokensException,
    LiquidityPoolNotFoundException, 
} from "@exceptions"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"

@Injectable()
export class SpotPriceService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly tickMathService: TickMathService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async getClmmSpotPrice(
        { liquidityPoolId }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const key = createCacheKey(CacheKey.SpotPrice, liquidityPoolId)
        const cacheResult = await this.cacheManager.get<string>(key)
        if (cacheResult) {
            const { price } = this.superjson.parse<SpotPriceCacheResult>(cacheResult)
            return new Decimal(price)
        }
        // we take the lp pool with lowest fee as the spot price
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => 
                liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId)
        }
        const state = await this.liquidityPoolStateService.getState(liquidityPool.displayId)
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            token => token.id === liquidityPool.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            token => token.id === liquidityPool.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const { price } = this.tickMathService.sqrtPriceX64ToPrice({
            sqrtPriceX64: state.dynamic.sqrtPriceX64,
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
        })
        // cache in 1 minute
        await this.cacheManager.set(
            createCacheKey(CacheKey.SpotPrice, liquidityPoolId), 
            this.superjson.stringify({ price }), 
            envConfig().cache.ttl.spotPrice
        )
        return price
    }

    async getDlmmSpotPrice(
        { liquidityPoolId }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const key = createCacheKey(CacheKey.SpotPrice, liquidityPoolId)
        const cacheResult = await this.cacheManager.get<string>(key)
        if (cacheResult) {
            const { price } = this.superjson.parse<SpotPriceCacheResult>(cacheResult)
            return new Decimal(price)
        }
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            token => token.id === liquidityPool.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            token => token.id === liquidityPool.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const { dynamic, static: _static } = await this.liquidityPoolStateService.getDlmmState(liquidityPool.displayId)
        const { price } = this.tickMathService.activeIdToPrice({
            activeId: dynamic.activeId,
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
            binStep: _static.binStep,
        })
        return new Decimal(price)
    }

    async getSpotPrice(
        { liquidityPoolId }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        if (liquidityPool.type === LiquidityPoolType.Clmm) {
            return this.getClmmSpotPrice({ liquidityPoolId })
        } else {
            return this.getDlmmSpotPrice({ liquidityPoolId })
        }
    }
}

export interface GetSpotPriceParams {
    liquidityPoolId: LiquidityPoolId
}
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
    LiquidityPoolType, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { 
    InvalidPoolTokensException,
    LiquidityPoolNotFoundException, 
} from "@exceptions"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { DlmmBinFormulaService } from "../formulas"

@Injectable()
export class SpotPriceService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dlmmBinFormulaService: DlmmBinFormulaService,
    ) {}

    async getClmmSpotPrice(
        { state }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const _state = state as LiquidityPoolState
        const key = createCacheKey(CacheKey.SpotPrice, _state.static.displayId)
        const cacheResult = await this.cacheManager.get<string>(key)
        if (cacheResult) {
            const { price } = this.superjson.parse<SpotPriceCacheResult>(cacheResult)
            return new Decimal(price)
        }
        // we take the lp pool with lowest fee as the spot price
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => 
                liquidityPool.displayId === _state.static.displayId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(_state.static.displayId)
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
        const price = TickMath.sqrtPriceX64ToPrice(
            _state.dynamic.sqrtPriceX64,
            tokenA.decimals,
            tokenB.decimals,
        )

        await this.cacheManager.set(
            createCacheKey(CacheKey.SpotPrice, _state.static.displayId), 
            this.superjson.stringify({ price }), 
            envConfig().cache.ttl.spotPrice,
        )
        return price
    }

    async getDlmmSpotPrice(
        { state }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const _state = state as DlmmLiquidityPoolState
        const key = createCacheKey(CacheKey.SpotPrice, _state.static.displayId)
        const cacheResult = await this.cacheManager.get<string>(key)
        if (cacheResult) {
            const { price } = this.superjson.parse<SpotPriceCacheResult>(cacheResult)
            return new Decimal(price)
        }
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === _state.static.displayId,
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
        const { dynamic } = _state
        const { price } = this.dlmmBinFormulaService.activeIdToPrice({
            activeId: dynamic.activeId,
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
            binStep: _state.static.binStep,
        })
        return price
    }

    async getSpotPrice(
        { state }
        : GetSpotPriceParams
    ): Promise<Decimal> {
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === _state.static.displayId,
        )
        if (!liquidityPool) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        if (liquidityPool.type === LiquidityPoolType.Clmm) {
            return this.getClmmSpotPrice({ state })
        } else {
            return this.getDlmmSpotPrice({ state })
        }
    }
}

export interface GetSpotPriceParams {
    state: LiquidityPoolState | DlmmLiquidityPoolState
}
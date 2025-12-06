import { LiquidityPoolNotFoundException, SuiLiquidityPoolInvalidTypeException } from "@exceptions"
import { DynamicLiquidityPoolInfo } from "../../types"
import { PrimaryMemoryStorageService, LiquidityPoolId, DexId, LoadBalancerName } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { AsyncService } from "@modules/mixin"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import BN from "bn.js"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { InjectSuperJson, LoadBalancerService } from "@modules/mixin"
import SuperJSON from "superjson"
import { EventEmitterService, EventName } from "@modules/event"
import { envConfig } from "@modules/env"
import { parseSuiPoolObject, Pool, SuiObjectPool } from "./struct"
import { SuiClient } from "@mysten/sui/client"

@Injectable()
export class TurbosObserverService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly events: EventEmitterService,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().botExecutor.suiPoolFetchInterval)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Turbos).toString()) continue
            promises.push(
                (
                    async () => {
                        await this.fetchPoolInfo(liquidityPool.displayId)
                    })()
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    private async fetchPoolInfo(
        liquidityPoolId: LiquidityPoolId
    ) {
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.TurbosClmm,
            this.primaryMemoryStorageService.clientConfig.turbosClmmClientRpcs.read
        )
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        const accountInfo = await client.getObject({
            id: liquidityPool.poolAddress,
            options: {
                showContent: true,
            },
        })
        if (!accountInfo) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        if (accountInfo.data?.content?.dataType !== "moveObject") throw new SuiLiquidityPoolInvalidTypeException(liquidityPoolId)
        const fields = accountInfo.data.content.fields as unknown as SuiObjectPool
        const pool = parseSuiPoolObject(fields)
        await this.handlePoolStateUpdate(liquidityPoolId, pool)
    }

    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
        state: Pool
    ) {
        const parsed: DynamicLiquidityPoolInfo = {
            tickCurrent: state.tickCurrentIndex,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPrice),
            rewards: state.rewardInfos,
        } 
        await this.asyncService.allIgnoreError(
            [
            // cache
                this.cacheManager.set(
                    createCacheKey(CacheKey.DynamicLiquidityPoolInfo, liquidityPoolId),
                    this.superjson.stringify(parsed),
                ),
                // event
                this.events.emit(
                    EventName.LiquidityPoolsFetched,
                    { liquidityPoolId, ...parsed },
                    { withoutLocal: true },
                ),
            ]
        )
        // logging
        this.winstonLogger.debug(
            WinstonLog.ObserveClmmPool, {
                liquidityPoolId,
                tickCurrent: parsed.tickCurrent.toString(),
                liquidity: parsed.liquidity.toString(),
                sqrtPriceX64: parsed.sqrtPriceX64.toString(),
            })
        return parsed
    }
}
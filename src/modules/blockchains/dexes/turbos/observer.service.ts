import { LiquidityPoolNotFoundException, SuiLiquidityPoolInvalidTypeException } from "@exceptions"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { PrimaryMemoryStorageService, LiquidityPoolId, DexId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { AsyncService, DayjsService } from "@modules/mixin"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { 
    CacheKey, 
    createCacheKey, 
    DynamicClmmLiquidityPoolInfoCacheResult, 
    InjectRedisCache 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Logger as winstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName } from "@modules/event"
import { envConfig } from "@modules/env"
import { parseTurbosPool, TurbosPool, TurbosSuiObjectPoolFields } from "./struct"

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
        private readonly winstonLogger: winstonLogger,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
    ) {}

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().timeConfig.interval.poolStateUpdate)
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
        try {
            const liquidityPool = this.memoryStorageService.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            const objectInfo = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.getObject({
                        id: liquidityPool.poolAddress,
                        options: {
                            showContent: true,
                        },
                    })
                },
            })
            if (!objectInfo) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            if (objectInfo.data?.content?.dataType !== "moveObject") throw new SuiLiquidityPoolInvalidTypeException(liquidityPoolId)
            const fields = objectInfo.data.content.fields as unknown as TurbosSuiObjectPoolFields
            const pool = parseTurbosPool(fields)
            await this.handlePoolStateUpdate(liquidityPoolId, pool)
        } catch (error) {
            this.winstonLogger.error(
                WinstonLog.FetchDlmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                })
        }
    }

    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
        state: TurbosPool
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickCurrentIndex,
            liquidity: state.liquidity,
            sqrtPriceX64: state.sqrtPrice,
            rewards: state.rewardInfos.map((reward) => ({
                tokenAddress: reward.vaultCoinType,
                emissionPerSecond: reward.emissionsPerSecond,
                growthGlobal: reward.growthGlobal,
                vaultAddress: reward.vault,
            })),
            feeGrowthGlobalA: state.feeGrowthGlobalA,
            feeGrowthGlobalB: state.feeGrowthGlobalB,
            snapshotAt: this.dayjsService.now(),
        }
        await this.asyncService.allIgnoreError(
            [
                // store in cache
                this.cacheManager.set(
                    createCacheKey(
                        CacheKey.DynamicClmmLiquidityPoolInfo, 
                        liquidityPoolId
                    ),
                    this.superjson.stringify(parsed),
                ),
                // emit event through event emitter
                this.eventEmitterService.emit<ClmmLiquidityPoolsFetchedEvent>(
                    EventName.ClmmLiquidityPoolsFetched,
                    { liquidityPoolId, ...parsed },
                    { withoutLocal: true },
                ),
            ]
        )
        return parsed
    }
}
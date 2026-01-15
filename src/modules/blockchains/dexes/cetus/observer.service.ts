import { LiquidityPoolNotFoundException, SuiLiquidityPoolInvalidTypeException } from "@exceptions"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { PrimaryMemoryStorageService, LiquidityPoolId, DexId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { AsyncService } from "@modules/mixin"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { parseCetusPool, CetusPool, CetusSuiObjectPoolFields } from "./struct"
import BN from "bn.js"
import { 
    CacheKey, 
    createCacheKey, 
    DynamicClmmLiquidityPoolInfoCacheResult, 
    InjectRedisCache 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { InjectSuperJson, DayjsService } from "@modules/mixin"
import SuperJSON from "superjson"
import { ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName } from "@modules/event"
import { envConfig } from "@modules/env"

@Injectable()
export class CetusObserverService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
    ) {}

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().timeConfig.interval.suiPoolStateUpdate)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Cetus).toString()) continue
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

            const objectInfo = await this.rpcExecutorService.withSuiClient(
                {
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return await suiClient.getObject({
                            id: liquidityPool.poolAddress,
                            options: {
                                showContent: true,
                            },
                        })
                    },
                }
            )
            if (!objectInfo) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            if (objectInfo.data?.content?.dataType !== "moveObject")
                throw new SuiLiquidityPoolInvalidTypeException(liquidityPoolId)
            const fields = objectInfo.data.content.fields as unknown as CetusSuiObjectPoolFields
            const pool = parseCetusPool(fields)
            return await this.handlePoolStateUpdate(liquidityPoolId, pool)
        } catch (error) {
            this.winstonLogger.error(
                WinstonLog.FetchClmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                }
            )
        }
    }

    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
        state: CetusPool
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.currentTickIndex,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.currentSqrtPrice),
            rewards: state.rewarderManager.rewarders.map((rewarder) => ({
                tokenAddress: rewarder.rewardCoin,
                emissionPerSecond: new BN(rewarder.emissionsPerSecond),
                growthGlobal: new BN(rewarder.growthGlobal),
            })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobalA),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobalB),
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
                this.eventEmitterService.emit<ClmmLiquidityPoolsFetchedEvent>
                (
                    EventName.ClmmLiquidityPoolsFetched,
                    { liquidityPoolId, ...parsed },
                    { withoutLocal: true },
                ),
            ]
        )
        return parsed
    }
}
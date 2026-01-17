import {
    ErrorSuiObjectName,
    LiquidityPoolNotFoundException,
    SuiObjectInvalidTypeException,
    SuiObjectNotFoundException
} from "@exceptions"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import {
    PrimaryMemoryStorageService,
    LiquidityPoolId,
    DexId,
    LiquidityPoolSchema
} from "@modules/databases"
import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { AsyncService } from "@modules/mixin"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import {
    CacheKey,
    createCacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
    InjectRedisCache
} from "@modules/cache"
import { Cache } from "cache-manager"
import { WinstonLog, WinstonService } from "@modules/winston"
import { InjectSuperJson, DayjsService } from "@modules/mixin"
import SuperJSON from "superjson"
import { ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName } from "@modules/event"
import { envConfig } from "@modules/env"
import { parseFlowxPool, FlowxPool, FlowxSuiObjectPoolFields } from "./struct"

@Injectable()
export class FlowXObserverService implements OnApplicationBootstrap, OnModuleInit {
    // snapshot here to reduce the computational complexity
    private liquidityPools: Array<LiquidityPoolSchema> = []
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
    ) { }

    onModuleInit() {
        this.liquidityPools = this.memoryStorageService.liquidityPoolCollection.find(
            {
                dex: createObjectId(DexId.FlowX),
            }
        )
    }

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }

    @Interval(envConfig().timeConfig.interval.poolStateUpdate)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.FlowX).toString()) continue
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
            const liquidityPool = this.memoryStorageService.liquidityPoolCollection.findOne({
                displayId: liquidityPoolId,
            })
            if (!liquidityPool) throw new LiquidityPoolNotFoundException({
                displayId: liquidityPoolId,
            })

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
            if (!objectInfo) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            if (objectInfo.data?.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            const fields = objectInfo.data.content.fields as unknown as FlowxSuiObjectPoolFields
            const pool = parseFlowxPool(fields)
            await this.handlePoolStateUpdate(liquidityPoolId, pool)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError, {
                liquidityPoolId,
                error: error.message,
            }
            )
        }
    }

    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
        state: FlowxPool
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickIndex,
            liquidity: state.liquidity,
            sqrtPriceX64: state.sqrtPrice,
            rewards: state.rewardInfos.map((reward) => ({
                tokenAddress: `0x${reward.rewardCoinType}`,
                emissionPerSecond: reward.rewardPerSeconds,
                growthGlobal: reward.rewardGrowthGlobal,
            })),
            feeGrowthGlobalA: state.feeGrowthGlobalX,
            feeGrowthGlobalB: state.feeGrowthGlobalY,
            snapshotAt: this.dayjsService.now(),
        }
        await this.asyncService.allIgnoreError(
            [
                // cache
                this.cacheManager.set(
                    createCacheKey(
                        CacheKey.DynamicClmmLiquidityPoolInfo,
                        liquidityPoolId
                    ),
                    this.superjson.stringify(parsed),
                ),
                // event
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
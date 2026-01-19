import {
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
    SuiObjectNotFoundException
} from "@modules/exceptions"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    PrimaryMemoryStorageService,
    DexId,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, 
    LokiJSService
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import {
    CacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
    CacheService
} from "@modules/cache"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    DayjsService 
} from "@modules/mixin"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    parseFlowxPool, FlowxPool, FlowxSuiObjectPoolFields 
} from "./struct"
import {
    Collection 
} from "lokijs"

@Injectable()
export class FlowXObserverService implements OnApplicationBootstrap, OnModuleInit {
    // snapshot here to reduce the computational complexity
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    async onModuleInit() {
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.FlowX),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "flowx-observer-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }

    @Interval(envConfig().dexes.flowx.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
            promises.push(
                (
                    async () => {
                        await this.fetchPoolInfo(liquidityPool)
                    })()
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    private async fetchPoolInfo(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
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
            if (objectInfo.error || !objectInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            const fields = objectInfo.data.content.fields as unknown as FlowxSuiObjectPoolFields
            const pool = parseFlowxPool(fields)
            await this.handlePoolStateUpdate(liquidityPool,
                pool)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError,
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
        }
    }

    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
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
                this.cacheService.set(
                    {
                        key: CacheKey.DynamicClmmLiquidityPoolInfo,
                        args: [liquidityPool.id],
                        cacheResult: parsed,
                    }
                ),
                // event
                this.eventEmitterService.emit(
                    EventName.ClmmLiquidityPoolsSynced,
                    {
                        id: liquidityPool.id,
                        ...parsed,
                    }
                ),
            ]
        )
        return parsed
    }
}
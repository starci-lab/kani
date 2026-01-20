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
    DexId
} from "@modules/databases"
import {
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, 
    LokiJSService,
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import { 
    DynamicClmmLiquidityPoolInfoCacheResult, 
    CacheService, 
    CacheKey 
} from "@modules/cache"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    DayjsService 
} from "@modules/mixin"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import {
    parseMomentumPool, MomentumPool, MomentumSuiObjectPoolFields 
} from "./struct"
import {
    envConfig 
} from "@modules/env"
import {
    Collection 
} from "lokijs"

@Injectable()
export class MomentumObserverService implements OnApplicationBootstrap, OnModuleInit {
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
    ) {}

    async onModuleInit() {
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Momentum).toString(),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "momentum-observer-liquidity-pools", 
            {
                indices: [
                    "poolAddress",
                    "displayId",
                    "id"
                ],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().dexes.momentum.interval.observer.fetch)
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
                    dexId: DexId.Momentum,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Momentum,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            const fields = objectInfo.data.content.fields as unknown as MomentumSuiObjectPoolFields
            const pool = parseMomentumPool(fields)
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
        state: MomentumPool
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
                // emit event through event emitter
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
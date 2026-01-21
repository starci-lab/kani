import {
    ErrorSuiObjectName,
    LiquidityPoolNotFoundException, 
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
    PrimaryMemoryStorageService, LiquidityPoolId, DexId, LiquidityPoolSchema 
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, DayjsService 
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import { 
    CacheService,
    DynamicClmmLiquidityPoolInfoCacheResult, 
    CacheKey,
} from "@modules/cache"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    parseTurbosPool, TurbosPool, TurbosSuiObjectPoolFields 
} from "./struct"

@Injectable()
export class TurbosObserverService implements OnApplicationBootstrap, OnModuleInit {
    private liquidityPools: Array<LiquidityPoolSchema> = []
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
    ) {}

    onModuleInit() {
        this.liquidityPools = this.memoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Turbos).toString(),
                },
            }
        )
    }

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().dexes.turbos.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPools) {
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
            const liquidityPool = this.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
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
            if (objectInfo.error || !objectInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Turbos,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Turbos,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            const fields = objectInfo.data.content.fields as unknown as TurbosSuiObjectPoolFields
            const pool = parseTurbosPool(fields)
            await this.handlePoolStateUpdate(liquidityPool,
                pool)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError,
                {
                    liquidityPoolId,
                    error: error.message,
                }
            )
        }
    }

    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: TurbosPool
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickCurrentIndex,
            liquidity: state.liquidity,
            sqrtPriceX64: state.sqrtPrice,
            rewards: state.rewardInfos.map((reward) => ({
                tokenAddress: `0x${reward.vaultCoinType}`,
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
                this.cacheService.set(
                    {
                        key: CacheKey.DynamicClmmLiquidityPoolInfo,
                        args: [liquidityPool.id],
                        cacheResult: parsed,
                    }
                ),
                // emit event through event emitter
                this.eventEmitterService.emit(
                    {
                        event: EventName.ClmmLiquidityPoolsSynced,
                        payload: {
                            id: liquidityPool.id,
                            ...parsed,
                        },
                    }
                ),
            ]
        )
        return parsed
    }
}
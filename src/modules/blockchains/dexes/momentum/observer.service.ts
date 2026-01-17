import {
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException, 
    SuiObjectNotFoundException 
} from "@exceptions"
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
    AsyncService 
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@utils"
import { 
    CacheKey, 
    createCacheKey, 
    DynamicClmmLiquidityPoolInfoCacheResult, 
    InjectRedisCache 
} from "@modules/cache"
import {
    Cache 
} from "cache-manager"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    InjectSuperJson, DayjsService 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName 
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    parseMomentumPool, MomentumPool, MomentumSuiObjectPoolFields 
} from "./struct"

@Injectable()
export class MomentumObserverService implements OnApplicationBootstrap, OnModuleInit {
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
    ) {}

    onModuleInit() {
        this.liquidityPools = this.memoryStorageService.liquidityPoolCollection.find({
            dex: createObjectId(DexId.Momentum),
        })
    }

    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }
    
    @Interval(envConfig().timeConfig.interval.poolStateUpdate)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPools) {
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
            if (!objectInfo) { 
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Momentum,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            if (objectInfo.data?.content?.dataType !== "moveObject") {
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
                // store in cache
                this.cacheManager.set(
                    createCacheKey(
                        CacheKey.DynamicClmmLiquidityPoolInfo, 
                        liquidityPool.displayId
                    ),
                    this.superjson.stringify(parsed),
                ),
                // emit event through event emitter
                this.eventEmitterService.emit<ClmmLiquidityPoolsFetchedEvent>(
                    EventName.ClmmLiquidityPoolsFetched,
                    {
                        liquidityPoolId: liquidityPool.displayId, 
                        ...parsed 
                    },
                    {
                        withoutLocal: true 
                    },
                ),
            ]
        )
        return parsed
    }
}
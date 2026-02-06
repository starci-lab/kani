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

/**
 * Service responsible for observing Turbos pool state changes.
 * Periodically fetches pool information from on-chain and updates cache.
 *
 * @example
 * const service = new TurbosObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class TurbosObserverService implements OnApplicationBootstrap, OnModuleInit {
    /** Array of liquidity pools to observe. */
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

    /**
     * Initializes the service by fetching all Turbos liquidity pools.
     */
    onModuleInit(): void {
        // fetch all Turbos liquidity pools from primary memory storage
        this.liquidityPools = this.memoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Turbos).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
    }

    /**
     * Starts the pool state update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handlePoolStateUpdateInterval()
    }
    
    /**
     * Handles periodic pool state updates.
     * Fetches pool information for all pools in parallel.
     */
    @Interval(envConfig().dexes.turbos.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        // process all pools in parallel
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPools) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo({
                        liquidityPoolId: liquidityPool.displayId
                    })
                })()
            )
        }
        
        // wait for all fetches to complete
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Fetches pool information from on-chain and updates cache.
     *
     * @param param - Parameters for fetching pool info
     * @param param.liquidityPoolId - Liquidity pool display ID
     */
    private async fetchPoolInfo({
        liquidityPoolId
    }: {
        liquidityPoolId: LiquidityPoolId
    }): Promise<void> {
        try {
            // find liquidity pool by display ID
            const liquidityPool = this.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) {
                throw new LiquidityPoolNotFoundException({
                    displayId: liquidityPoolId,
                })
            }
            
            // fetch pool object from on-chain
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
            
            // validate object exists
            if (objectInfo.error || !objectInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Turbos,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            
            // validate object type
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Turbos,
                    liquidityPoolId: liquidityPoolId,
                })
            }
            
            // parse pool fields and update state
            const fields = objectInfo.data.content.fields as unknown as TurbosSuiObjectPoolFields
            const pool = parseTurbosPool(fields)
            await this.handlePoolStateUpdate({
                liquidityPool,
                state: pool
            })
        } catch (error) {
            // log fetch errors
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError,
                {
                    liquidityPoolId,
                    error: error.message,
                }
            )
        }
    }

    /**
     * Handles pool state update by caching and emitting events.
     *
     * @param param - Parameters for handling pool state update
     * @param param.liquidityPool - Liquidity pool schema
     * @param param.state - Parsed pool state
     * @returns Cache result
     */
    private async handlePoolStateUpdate({
        liquidityPool,
        state
    }: {
        liquidityPool: LiquidityPoolSchema
        state: TurbosPool
    }): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        // build cache result from parsed pool state
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
            rewardLastUpdatedTimeMs: state.rewardLastUpdatedTimeMs,
        }
        
        // cache result and emit event in parallel
        await this.asyncService.allIgnoreError([
            // store in cache
            this.cacheService.set({
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id],
                cacheResult: parsed,
            }),
            // emit event through event emitter
            this.eventEmitterService.emit({
                event: EventName.ClmmLiquidityPoolsSynced,
                payload: {
                    id: liquidityPool.id,
                    ...parsed,
                },
            })
        ])
        
        return parsed
    }
}
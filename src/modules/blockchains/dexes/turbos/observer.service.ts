import {
    LiquidityPoolNotFoundException, 
} from "@modules/exceptions"
import {
    SuiFetchService, 
    SuiObjectKind
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService, LiquidityPoolId, DexId, LiquidityPoolSchema 
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, DayjsService, 
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/common"
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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly suiFetchService: SuiFetchService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * Initializes the service by fetching all Turbos liquidity pools.
     */
    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // fetch all Turbos liquidity pools from primary memory storage
        this.liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values()
        ).filter(
            (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Turbos).toString(),
        )
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
            
            const objectInfo = await this.suiFetchService.fetchObject<TurbosSuiObjectPoolFields>({
                objectId: liquidityPool.poolAddress,
                kind: SuiObjectKind.Pool,
                dexId: DexId.Turbos,
                liquidityPool,
            })
            const pool = parseTurbosPool(objectInfo)
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
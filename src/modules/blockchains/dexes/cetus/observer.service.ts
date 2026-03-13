import {
    SuiFetchService, 
    SuiObjectKind
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService, 
    DexId 
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, 
    ReadinessWatcherFactoryService,
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/common"
import {
    parseCetusPool, CetusPool, CetusSuiObjectPoolFields 
} from "./struct"
import BN from "bn.js"
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
    EventEmitterService, 
    EventName
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    LiquidityPoolSchema 
} from "@modules/databases"
/**
 * Service responsible for observing Cetus pool state changes.
 * Periodically fetches pool information from on-chain and updates cache.
 *
 * @example
 * const service = new CetusObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class CetusObserverService implements OnApplicationBootstrap, OnModuleInit {
    /** Snapshot map to reduce computational complexity. */
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly suiFetchService: SuiFetchService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * Initializes the service by creating a snapshot map of liquidity pools.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // fetch all Cetus liquidity pools from primary memory storage
        const liquidityPools = Array.from(this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Cetus).toString(),
            )
        // create local map snapshot for efficient processing
        this.liquidityPoolMap = new Map(liquidityPools.map(
            (liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]
        )
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
    @Interval(envConfig().dexes.cetus.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        // process all pools in parallel
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })()
            )
        }
        // wait for all fetches to complete
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Fetches pool information from on-chain and updates cache.
     *
     * @param liquidityPool - The liquidity pool schema to fetch information for
     */
    private async fetchPoolInfo(liquidityPool: LiquidityPoolSchema): Promise<void> {
        try {
            const objectInfo = await this
                .suiFetchService
                .fetchObject<CetusSuiObjectPoolFields>(
                    {
                        objectId: liquidityPool.poolAddress,
                        kind: SuiObjectKind.Pool,
                        dexId: DexId.Cetus,
                        liquidityPool,
                    }
                )
            const pool = parseCetusPool(objectInfo)
            await this.handlePoolStateUpdate(
                liquidityPool,
                pool
            )
        } catch (error) {
            // log fetch errors
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError, 
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
        }
    }

    /**
     * Handles pool state update by caching and emitting events.
     *
     * @param liquidityPool - Liquidity pool schema
     * @param state - Parsed pool state
     * @returns Cache result
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: CetusPool
    ): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        // build cache result from parsed pool state
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.currentTickIndex,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.currentSqrtPrice),
            rewards: state.rewarderManager.rewarders.map((rewarder) => ({
                tokenAddress: `0x${rewarder.rewardCoin}`,
                emissionPerSecond: new BN(rewarder.emissionsPerSecond),
                growthGlobal: new BN(rewarder.growthGlobal),
            })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobalA),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobalB),
            snapshotAt: this.dayjsService.now(),
            rewardLastUpdatedTimeMs: state.rewarderManager.lastUpdatedTime,
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
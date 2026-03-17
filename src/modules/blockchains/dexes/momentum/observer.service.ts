import {
    SuiFetchService, SuiObjectKind
} from "@modules/blockchains"
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
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    AsyncService,
    JitterService,
    ReadinessWatcherFactoryService,
} from "@modules/mixin"
import {
    Interval
} from "@nestjs/schedule"
import {
    createObjectId
} from "@modules/common"
import {
    DynamicClmmLiquidityPoolInfoCacheResult,
    CacheService,
    CacheKey
} from "@modules/cache"
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

/**
 * Service responsible for observing and updating Momentum liquidity pool states.
 * Fetches pool information at regular intervals and updates cache and emits events.
 *
 * @example
 * const service = new MomentumObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class MomentumObserverService implements OnApplicationBootstrap, OnModuleInit {
    // Snapshot map to reduce the computational complexity
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly suiFetchService: SuiFetchService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly jitterService: JitterService,
    ) { }

    /**
     * Initializes the module by creating a snapshot of Momentum liquidity pools.
     * This reduces computational complexity by working with a local collection.
     */
    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // Find Momentum liquidity pools from primary memory storage
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Momentum).toString(),
            )

        // Create a new LokiJS collection for Momentum liquidity pools
        this.liquidityPoolMap = new Map(liquidityPools.map((liquidityPool) => [liquidityPool.id,
            liquidityPool]))
    }

    /**
     * Called once the application has bootstrapped.
     * Initiates the periodic pool state update.
     */
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
    }

    /**
     * Handles the periodic update of pool states.
     * Fetches information for all Momentum liquidity pools.
     */
    @Interval(envConfig().dexes.momentum.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        // Iterate over each liquidity pool and fetch its info
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            promises.push(
                (
                    async () => {
                        await this.jitterService.delayWithJitter(
                            envConfig().dexes.momentum.interval.observer.fetch
                        )
                        await this.fetchPoolInfo(liquidityPool)
                    })()
            )
        }
        // Execute all fetch operations concurrently, ignoring individual errors
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Fetches the latest information for a given liquidity pool from the Sui blockchain.
     *
     * @param liquidityPool - The liquidity pool schema to fetch information for
     */
    private async fetchPoolInfo(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
            // Fetch object info from Sui client
            const { data: poolRaw } = await this.suiFetchService.fetchObject<MomentumSuiObjectPoolFields>({
                objectId: liquidityPool.poolAddress,
                kind: SuiObjectKind.Pool,
                dexId: DexId.Momentum,
                liquidityPool,
            })
            const pool = parseMomentumPool(poolRaw)
            return await this.handlePoolStateUpdate(liquidityPool,
                pool)
        } catch (error) {
            // Log any errors encountered during fetching pool info
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
     * Handles the update of a liquidity pool's dynamic state.
     * Stores the updated state in cache and emits a `ClmmLiquidityPoolsSynced` event.
     *
     * @param liquidityPool - The liquidity pool schema being updated
     * @param state - The parsed Momentum pool state
     * @returns The parsed dynamic CLMM liquidity pool information
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: MomentumPool
    ) {
        // Parse dynamic CLMM liquidity pool information
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickIndex,
            liquidity: state.liquidity,
            sqrtPriceX64: state.sqrtPrice,
            rewards: state.rewardInfos.map((reward) => ({
                tokenAddress: `0x${reward.rewardCoinType}`,
                emissionPerSecond: reward.rewardPerSeconds,
                growthGlobal: reward.rewardGrowthGlobal,
                lastUpdateTimeMs: reward.lastUpdateTime,
            })),
            feeGrowthGlobalA: state.feeGrowthGlobalX,
            feeGrowthGlobalB: state.feeGrowthGlobalY,
            snapshotAt: this.dayjsService.now(),
        }

        // Store in cache and emit event concurrently
        await this.asyncService.allIgnoreError(
            [
                // Store the parsed information in cache
                this.cacheService.set(
                    {
                        key: CacheKey.DynamicClmmLiquidityPoolInfo,
                        args: [liquidityPool.id],
                        cacheResult: parsed,
                    }
                ),
                // Emit an event indicating that CLMM liquidity pools have been synced
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
        this.winstonService.log(
            WinstonLog.LiquidityPoolUpdated,
            {
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        return parsed
    }
}
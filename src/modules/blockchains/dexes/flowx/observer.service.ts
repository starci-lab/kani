import {
    SuiFetchService, SuiObjectKind 
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService, DexId, LiquidityPoolSchema 
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, LokiJSService 
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/common"
import {
    CacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
    CacheService,
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

/**
 * Service responsible for observing FlowX pool state changes.
 * Periodically fetches pool information from on-chain and updates cache.
 *
 * @example
 * const service = new FlowXObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class FlowXObserverService implements OnApplicationBootstrap, OnModuleInit {
    /** Snapshot collection to reduce computational complexity. */
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>

    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly lokiJSService: LokiJSService,
        private readonly suiFetchService: SuiFetchService,
    ) {}

    /**
     * Initializes the service by creating a snapshot collection of liquidity pools.
     */
    async onModuleInit(): Promise<void> {
        // fetch all FlowX liquidity pools from primary memory storage
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.FlowX).toString(),
                },
            })
            .data({
                removeMeta: true,
            })

        // create local collection snapshot for efficient processing
        this.liquidityPoolCollection =
            await this.lokiJSService.createCollection<LiquidityPoolSchema>({
                name: "flowx-observer-liquidity-pools",
                options: {
                    indices: ["poolAddress",
                        "displayId",
                        "id"],
                },
            })

        // insert pools into snapshot collection
        this.liquidityPoolCollection.insert(liquidityPools)
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
    @Interval(envConfig().dexes.flowx.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        // process all pools in parallel
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })(),
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
            const poolRaw = await this.suiFetchService.fetchObject<FlowxSuiObjectPoolFields>({
                // FlowX uses poolAddress as on-chain object id (per your original code)
                objectId: liquidityPool.poolAddress,
                kind: SuiObjectKind.Pool,
                dexId: DexId.FlowX,
                liquidityPool,
            })

            const pool = parseFlowxPool(poolRaw)
            await this.handlePoolStateUpdate(liquidityPool,
                pool)
        } catch (error) {
            // log fetch errors
            this.winstonService.log(WinstonLog.LiquidityPoolFetchedError,
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                })
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
        state: FlowxPool,
    ): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        // build cache result from parsed pool state
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
            }),
        ])

        return parsed
    }
}

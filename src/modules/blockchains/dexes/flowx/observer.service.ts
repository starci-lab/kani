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
} from "@modules/common"
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

/**
 * Service responsible for observing and updating FlowX liquidity pool states.
 * Fetches pool information at regular intervals and updates cache and emits events.
 *
 * @example
 * const service = new FlowXObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class FlowXObserverService implements OnApplicationBootstrap, OnModuleInit {
    // Snapshot here to reduce the computational complexity
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

    /**
     * Initializes the module by creating a snapshot of FlowX liquidity pools.
     * This reduces computational complexity by working with a local collection.
     */
    async onModuleInit() {
        // Find FlowX liquidity pools from primary memory storage
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.FlowX).toString(),
                },
            })
            .data({
                removeMeta: true 
            })

        // Create a new LokiJS collection for FlowX liquidity pools
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "flowx-observer-liquidity-pools",
            options: {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            },
        })

        // Insert the found liquidity pools into the new collection
        this.liquidityPoolCollection.insert(liquidityPools)
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
     * Fetches information for all FlowX liquidity pools.
     */
    @Interval(envConfig().dexes.flowx.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        // Iterate over each liquidity pool and fetch its info
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                (
                    async () => {
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

            // Validate if object info exists
            if (objectInfo.error || !objectInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }

            // Validate object data type
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.FlowX,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }

            // Parse pool fields and handle state update
            const fields = objectInfo.data.content.fields as unknown as FlowxSuiObjectPoolFields
            const pool = parseFlowxPool(fields)
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
     * @param state - The parsed FlowX pool state
     * @returns The parsed dynamic CLMM liquidity pool information
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: FlowxPool
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
        return parsed
    }
}
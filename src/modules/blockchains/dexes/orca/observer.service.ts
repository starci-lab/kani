import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import { 
    CacheKey, 
    DynamicClmmLiquidityPoolInfoCacheResult,
    CacheService,
} from "@modules/cache"
import BN from "bn.js"
import {
    PrimaryMemoryStorageService,
    DexId,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    AsyncService, RetryService 
} from "@modules/mixin"
import {
    LiquidityPoolNoWsIdleTimeoutException, LiquidityPoolNotFoundException 
} from "@modules/exceptions"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import {
    createObjectId 
} from "@modules/utils"
import {
    Whirlpool 
} from "./beets"
import {
    address, fetchEncodedAccount 
} from "@solana/kit"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    DayjsService, LokiJSService 
} from "@modules/mixin"
import {
    Collection 
} from "lokijs"

/**
 * Service responsible for observing and updating Orca liquidity pool states.
 * Fetches pool information at regular intervals and via WebSocket subscriptions, updating cache and emitting events.
 *
 * @example
 * const service = new OrcaObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap, OnModuleInit {
    // Snapshot here to reduce the computational complexity
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>

    constructor(
        private readonly winstonService: WinstonService,
        private readonly cacheManager: CacheService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,    
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly lokiJSService: LokiJSService,
    ) {}

    /**
     * Initializes the module by creating a snapshot of Orca liquidity pools.
     * This reduces computational complexity by working with a local collection.
     */
    async onModuleInit() {
        // Find Orca liquidity pools from primary memory storage
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Orca).toString(),
                },
            })
            .data({
                removeMeta: true 
            })

        // Create a new LokiJS collection for Orca liquidity pools
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "orca-observer-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })

        // Insert the found liquidity pools into the new collection
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    /**
     * Called once the application has bootstrapped.
     * Initiates periodic pool state updates and WebSocket subscriptions for all pools.
     */
    onApplicationBootstrap() {
        // Start periodic fetching
        this.handlePoolStateUpdateInterval()

        // Start WebSocket subscriptions for each pool
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            this.observeClmmPool(liquidityPool)
        }
    }

    /**
     * Handles the periodic update of pool states.
     * Fetches information for all Orca liquidity pools every configured interval.
     * This ensures pool state is updated even if WebSocket events are missed.
     */
    @Interval(envConfig().dexes.orca.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        // Iterate over each liquidity pool and fetch its info
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })()
            )
        }
        // Execute all fetch operations concurrently, ignoring individual errors
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Handles the update of a liquidity pool's dynamic state.
     * Stores the updated state in cache and emits a `ClmmLiquidityPoolsSynced` event.
     *
     * @param liquidityPool - The liquidity pool schema being updated
     * @param state - The parsed Whirlpool state from on-chain data
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: ReturnType<typeof Whirlpool.struct["read"]>
    ) {
        // Parse dynamic CLMM liquidity pool information
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: new BN(state.tickCurrentIndex),
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPrice),
            rewards: state.rewardInfos
                // Filter out empty rewards (mint address is all zeros)
                .filter((reward) => reward.mint.toString() !== "11111111111111111111111111111111")
                .map((reward) => ({
                    tokenAddress: reward.mint.toString(),
                    emissionPerSecond: new BN(reward.emissionsPerSecondX64),
                    growthGlobal: new BN(reward.growthGlobalX64),
                })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobalA),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobalB),
            snapshotAt: this.dayjsService.now(),
            rewardLastUpdatedTimeMs: new BN(state.rewardLastUpdatedTimestamp.toString()),
        }

        // Store in cache and emit event concurrently
        await this.asyncService.allIgnoreError([
            // Store the parsed information in cache
            this.cacheManager.set(
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
                },
            ),
        ])
    }

    /**
     * Fetches the latest information for a given liquidity pool from the Solana blockchain.
     *
     * @param liquidityPool - The liquidity pool schema to fetch information for
     */
    private async fetchPoolInfo(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
            // Fetch account info from Solana client
            const accountInfo = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await fetchEncodedAccount(
                        rpc, 
                        address(liquidityPool.poolAddress),
                        {
                            commitment: "confirmed",
                        })
                },
            })

            // Validate if account info exists
            if (!accountInfo || !accountInfo.exists) {
                throw new LiquidityPoolNotFoundException({
                    displayId: liquidityPool.displayId,
                })
            }

            // Parse pool state from account data (skip 8-byte discriminator)
            const state = Whirlpool.struct.read(Buffer.from(accountInfo.data),
                8)
            return await this.handlePoolStateUpdate(liquidityPool,
                state)
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
     * Observes a CLMM pool via WebSocket subscription.
     * Subscribes to account changes and updates pool state in real-time.
     * Includes idle timeout mechanism to reconnect if no updates are received.
     *
     * @param liquidityPool - The liquidity pool schema to observe
     */
    private async observeClmmPool(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
            // Stage: state validation (WebSocket idle timeout must be configured)
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException({
                    displayId: liquidityPool.displayId,
                })
            }

            // Set up abort controller and timeout mechanism for idle detection
            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                // Set timeout to abort connection if no updates received
                timeout = setTimeout(() => abortController.abort(),
                    liquidityPool.wsIdleTimeoutMs)
            }

            // Retry subscription indefinitely on connection failures
            await this.retryService.retry({
                action: async () => {
                    await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Ws,
                        callback: async ({ rpcSubscriptions }) => {
                            const controller = new AbortController()
                            // Subscribe to account notifications
                            const accountNotifications = await rpcSubscriptions.accountNotifications(
                                address(liquidityPool.poolAddress),
                                {
                                    commitment: "confirmed",
                                    encoding: "base64",
                                }
                            ).subscribe({
                                abortSignal: controller.signal,
                            })

                            // Process each account update notification
                            for await (const accountNotification of accountNotifications) {
                                // Parse pool state from notification data (skip 8-byte discriminator)
                                const state = Whirlpool.struct.read(
                                    Buffer.from(accountNotification.value?.data.toString(),
                                        "base64"),
                                    8
                                )
                                // Reset idle timeout on each update
                                resetTimeout()
                                // Handle the pool state update
                                await this.handlePoolStateUpdate(liquidityPool,
                                    state)
                            }
                        },
                        options: {
                            retries: Infinity,
                        },
                    })
                }
            })
        } catch (error) {
            // Log any errors encountered during WebSocket observation
            this.winstonService.log(
                WinstonLog.LiquidityPoolWsError,
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
        }
    }
}
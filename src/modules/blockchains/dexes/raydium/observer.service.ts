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
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    AsyncService, DayjsService, RetryService, LokiJSService 
} from "@modules/mixin"
import {
    LiquidityPoolNotFoundException, LiquidityPoolNoWsIdleTimeoutException, 
    SolanaAccountNotFoundException, ErrorSolanaAccountKind
} from "@modules/exceptions"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import {
    createObjectId 
} from "@modules/common"
import {
    Interval 
} from "@nestjs/schedule"
import {
    address, fetchEncodedAccount 
} from "@solana/kit"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    PoolState 
} from "./beets"
import {
    Collection 
} from "lokijs"

/**
 * Service responsible for observing and updating Raydium liquidity pool states.
 * Fetches pool information at regular intervals and via WebSocket subscriptions, updating cache and emitting events.
 *
 * @example
 * const service = new RaydiumObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap, OnModuleInit {
    // Snapshot here to reduce the computational complexity
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>

    constructor(
        private readonly winstonService: WinstonService,
        private readonly cacheManager: CacheService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    /**
     * Initializes the module by creating a snapshot of Raydium liquidity pools.
     * This reduces computational complexity by working with a local collection.
     */
    async onModuleInit() {
        // Find Raydium liquidity pools from primary memory storage
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Raydium).toString(),
                },
            })
            .data({
                removeMeta: true 
            })

        // Create a new LokiJS collection for Raydium liquidity pools
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "raydium-observer-liquidity-pools",
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
     * Fetches information for all Raydium liquidity pools every configured interval.
     * This ensures pool state is updated even if WebSocket events are missed.
     */
    @Interval(envConfig().dexes.raydium.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        // Iterate over each liquidity pool and fetch its info
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                this.fetchPoolInfo(liquidityPool.displayId)
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
     * @param state - The parsed PoolState from on-chain data
     * @returns The parsed dynamic CLMM liquidity pool information
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: PoolState
    ) {
        // Parse dynamic CLMM liquidity pool information
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: new BN(state.tickCurrent),
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPriceX64),
            rewards: state.rewardInfos
                // Filter out empty rewards (mint address is all zeros)
                .filter((rewardInfo) => rewardInfo.tokenMint.toString() !== "11111111111111111111111111111111")
                .map((rewardInfo) => ({
                    tokenAddress: rewardInfo.tokenMint.toString(),
                    emissionPerSecond: new BN(rewardInfo.emissionsPerSecondX64.toString()),
                    growthGlobal: new BN(rewardInfo.rewardGrowthGlobalX64.toString()),
                    lastUpdateTimeMs: new BN(rewardInfo.lastUpdateTime.toString()),
                })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobal0X64.toString()),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobal1X64.toString()),
            snapshotAt: this.dayjsService.now(),
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
                }
            ),
        ])

        return parsed
    }

    /**
     * Fetches the latest information for a given liquidity pool from the Solana blockchain.
     *
     * @param liquidityPoolId - The liquidity pool ID to fetch information for
     */
    private async fetchPoolInfo(
        liquidityPoolId: LiquidityPoolId
    ) {
        // Find liquidity pool from collection
        const liquidityPool = this.liquidityPoolCollection.findOne({
            id: {
                $eq: liquidityPoolId,
            },
        })
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                displayId: liquidityPoolId,
            })
        }

        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // Fetch account info from Solana client
                const accountInfo = await fetchEncodedAccount(rpc,
                    address(liquidityPool.poolAddress),
                    {
                        commitment: "confirmed",
                    })

                // Validate if account info exists
                if (!accountInfo || !accountInfo.exists) {
                    throw new SolanaAccountNotFoundException({
                        kind: ErrorSolanaAccountKind.Pool,
                        address: liquidityPool.poolAddress,
                        dexId: DexId.Raydium,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }

                // Parse pool state from account data (skip 8-byte discriminator)
                const [state] = PoolState.struct.deserialize(Buffer.from(accountInfo.data),
                    8)
                return await this.handlePoolStateUpdate(liquidityPool,
                    state)
            },
        })
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
                                const [state] = PoolState.struct.deserialize(
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
                            // Never throw an error, if the RPC is not available, just retry
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

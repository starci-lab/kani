import {
    Injectable, OnApplicationBootstrap, OnModuleInit
} from "@nestjs/common"
import {
    CacheKey,
    DynamicDlmmLiquidityPoolInfoCacheResult,
} from "@modules/cache"
import {
    PrimaryMemoryStorageService,
    DexId,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    AsyncService, 
    DayjsService,
    LokiJSService,
} from "@modules/mixin"
import {
    LiquidityPoolNoWsIdleTimeoutException, SolanaAccountNotFoundException, ErrorSolanaAccountName
} from "@modules/exceptions"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    EventEmitterService,
    EventName
} from "@modules/event"
import {
    createObjectId
} from "@modules/common"
import {
    LbPair
} from "./beets"
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
import BN from "bn.js"
import {
    RetryService
} from "@modules/mixin"
import {
    CacheService 
} from "@modules/cache"
import {
    Collection 
} from "lokijs"

/**
 * Service responsible for observing and updating Meteora liquidity pool states.
 * Fetches pool information at regular intervals and via WebSocket subscriptions, updating cache and emitting events.
 *
 * @example
 * const service = new MeteoraObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class MeteoraObserverService implements OnApplicationBootstrap, OnModuleInit {
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>

    constructor(
        private readonly winstonService: WinstonService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly cacheService: CacheService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    /**
     * Initializes the module by creating a snapshot of Meteora liquidity pools.
     * This reduces computational complexity by working with a local collection.
     */
    async onModuleInit() {
        // Find Meteora liquidity pools from primary memory storage
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find(
                {
                    dex: {
                        $eq: createObjectId(DexId.Meteora).toString(),
                    },
                }
            )
            .data({
                removeMeta: true 
            })

        // Create a new LokiJS collection for Meteora liquidity pools
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "meteora-observer-liquidity-pools",
            options: {
                indices: ["poolAddress",
                    "displayId",
                    "dex"],
            },
        })

        // Insert the found liquidity pools into the new collection
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    /**
     * Handles the periodic update of pool states.
     * Fetches information for all Meteora liquidity pools every configured interval.
     * This ensures pool state is updated even if WebSocket events are missed.
     */
    @Interval(envConfig().dexes.meteora.interval.observer.fetch)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        // Iterate over each liquidity pool and fetch its info
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })(),
            )
        }
        // Execute all fetch operations concurrently, ignoring individual errors
        await this.asyncService.allIgnoreError(promises)
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
            this.observeDlmmPool(liquidityPool)
        }
    }

    /**
     * Handles the update of a liquidity pool's dynamic state.
     * Stores the updated state in cache and emits a `DlmmLiquidityPoolsSynced` event.
     *
     * @param liquidityPool - The liquidity pool schema being updated
     * @param state - The parsed LbPair state from on-chain data
     * @returns The parsed pool state
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: ReturnType<(typeof LbPair.struct)["read"]>,
    ) {
        // Parse dynamic DLMM liquidity pool information
        const dynamicDlmmLiquidityPoolInfo: DynamicDlmmLiquidityPoolInfoCacheResult =
        {
            activeId: new BN(state.active_id),
            rewards: state.reward_infos
                // Filter out empty rewards (mint address is all zeros)
                .filter((reward) => reward.mint.toString() !== "11111111111111111111111111111111")
                .map((reward) => ({
                    tokenAddress: `0x${reward.mint.toString()}`,
                    vault: reward.vault.toString(),
                    funder: reward.funder.toString(),
                    rewardDuration: new BN(reward.reward_duration.toString()),
                    rewardDurationEnd: new BN(reward.reward_duration_end.toString()),
                    rewardRate: new BN(reward.reward_rate.toString()),
                    lastUpdateTime: new BN(reward.last_update_time.toString()),
                    cumulativeSecondsWithEmptyLiquidityReward: new BN(reward.cumulative_seconds_with_empty_liquidity_reward.toString()),
                })),
            snapshotAt: this.dayjsService.now(),
        }

        // Store in cache and emit event concurrently
        await this.asyncService.allIgnoreError([
            // Store the parsed information in cache
            this.cacheService.set(
                {
                    key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                    args: [liquidityPool.id],
                    cacheResult: dynamicDlmmLiquidityPoolInfo,
                }
            ),
            // Emit an event indicating that DLMM liquidity pools have been synced
            this.eventEmitterService.emit(
                {
                    event: EventName.DlmmLiquidityPoolsSynced,
                    payload: {
                        id: liquidityPool.id,
                        ...dynamicDlmmLiquidityPoolInfo,
                    },
                }
            ),
        ])
        return state
    }

    /**
     * Fetches the latest information for a given liquidity pool from the Solana blockchain.
     *
     * @param liquidityPool - The liquidity pool schema to fetch information for
     */
    private async fetchPoolInfo(liquidityPool: LiquidityPoolSchema) {
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
                        },
                    )
                }
            })

            // Validate if account info exists
            if (!accountInfo || !accountInfo.exists) {
                throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.Pool,
                    address: liquidityPool.poolAddress,
                    dexId: DexId.Meteora,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }

            // Parse pool state from account data (skip 8-byte discriminator)
            const state = LbPair.struct.read(Buffer.from(accountInfo.data),
                8)
            return await this.handlePoolStateUpdate(
                liquidityPool,
                state
            )
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
     * Observes a DLMM pool via WebSocket subscription.
     * Subscribes to account changes and updates pool state in real-time.
     * Includes idle timeout mechanism to reconnect if no updates are received.
     *
     * @param liquidityPool - The liquidity pool schema to observe
     */
    private async observeDlmmPool(liquidityPool: LiquidityPoolSchema) {
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
                    liquidityPool.wsIdleTimeoutMs
                )
            }

            // Retry subscription indefinitely on connection failures
            await this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    await this.rpcExecutorService.withSolanaRpc(
                        {
                            accessType: RpcAccessType.Ws,
                            callback: async ({ rpcSubscriptions }) => {
                                const controller = new AbortController()
                                // Subscribe to account notifications
                                const accountNotifications = await rpcSubscriptions
                                    .accountNotifications(
                                        address(liquidityPool.poolAddress),
                                        {
                                            commitment: "confirmed",
                                            encoding: "base64",
                                        }
                                    )
                                    .subscribe({
                                        abortSignal: controller.signal,
                                    })

                                // Process each account update notification
                                for await (const accountNotification of accountNotifications) {
                                    // Parse pool state from notification data (skip 8-byte discriminator)
                                    const state = LbPair.struct.read(
                                        Buffer.from(
                                            accountNotification.value?.data.toString(),
                                            "base64",
                                        ),
                                        8,
                                    )
                                    // Reset idle timeout on each update
                                    resetTimeout()
                                    // Handle the pool state update
                                    await this.handlePoolStateUpdate(liquidityPool,
                                        state)
                                }
                            },
                        }
                    )
                }
            }
            )
        } catch (error) {
            // Log any errors encountered during WebSocket observation
            this.winstonService.log(WinstonLog.LiquidityPoolWsError,
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                })
        }
    }
}

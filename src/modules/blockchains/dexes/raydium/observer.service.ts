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
    AsyncService, 
    DayjsService, 
    RetryService, 
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    LiquidityPoolNoWsIdleTimeoutException,
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
    address
} from "@solana/kit"
import {
    RpcExecutorService,
    SolanaFetchService,
    AccountKind
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

/**
 * Observes Raydium CLMM pools: fetches pool state on an interval and via WebSocket, updates cache and emits ClmmLiquidityPoolsSynced.
 *
 * @example
 * await raydiumObserverService.onModuleInit()
 * // then onApplicationBootstrap starts interval and WS subscriptions
 */
@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap, OnModuleInit {
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

    constructor(
        private readonly winstonService: WinstonService,
        private readonly cacheManager: CacheService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) { }

    /**
     * Initializes observer: wait for primary memory storage, build local pool map for Raydium pools.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // fetch all Raydium liquidity pools from primary memory storage
        const liquidityPools = Array.from(this.primaryMemoryStorageService.liquidityPoolMap.values()).filter(
            (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Raydium).toString(),
        )
        this.liquidityPoolMap = new Map(liquidityPools.map((liquidityPool) => [liquidityPool.id,
            liquidityPool]))
    }

    /**
     * Starts periodic pool-state fetch and WebSocket subscription per pool.
     */
    onApplicationBootstrap(): void {
        this.handlePoolStateUpdateInterval()
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            this.observeClmmPool(liquidityPool)
        }
    }

    /**
     * Runs on interval: fetches pool info for all Raydium pools and updates cache/events.
     */
    @Interval(envConfig().dexes.raydium.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Builds cache result from on-chain state, writes to cache and emits ClmmLiquidityPoolsSynced.
     *
     * @param liquidityPool - Pool schema being updated
     * @param state - Parsed PoolState from chain
     * @returns Parsed cache result
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: PoolState,
    ): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
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
                    vaultAddress: rewardInfo.tokenVault?.toString() ?? "",
                    expired: this.dayjsService
                        .now()
                        .isAfter(this.dayjsService
                            .fromSeconds(new BN(rewardInfo.endTime.toString()).toNumber())),
                })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobal0X64.toString()),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobal1X64.toString()),
            snapshotAt: this.dayjsService.now(),
        }
        await this.asyncService.allIgnoreError([
            this.cacheManager.set({
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id],
                cacheResult: parsed,
            }),
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
     * Fetches pool account from chain, parses state and calls handlePoolStateUpdate.
     *
     * @param liquidityPool - Pool to fetch
     */
    private async fetchPoolInfo(liquidityPool: LiquidityPoolSchema): Promise<void> {
        try {
            const accountInfo = await this.solanaFetchService.fetchAccount({
                address: liquidityPool.poolAddress,
                kind: AccountKind.Pool,
                dexId: DexId.Raydium,
                liquidityPool,
            })
            const state = PoolState.struct.read(Buffer.from(accountInfo.data),
                8)
            await this.handlePoolStateUpdate(liquidityPool,
                state)
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

    /**
     * Subscribes to pool account via WebSocket; on each update parses state and calls handlePoolStateUpdate.
     * Uses idle timeout to abort and retry if no updates received.
     *
     * @param liquidityPool - Pool to observe
     */
    private async observeClmmPool(liquidityPool: LiquidityPoolSchema): Promise<void> {
        try {
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException({
                    displayId: liquidityPool.displayId,
                })
            }

            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) clearTimeout(timeout)
                timeout = setTimeout(() => abortController.abort(),
                    liquidityPool.wsIdleTimeoutMs)
            }
            await this.retryService.retry({
                action: async () => {
                    await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Ws,
                        callback: async ({ rpcSubscriptions }) => {
                            const controller = new AbortController()
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
                                await this.handlePoolStateUpdate(
                                    liquidityPool,
                                    state
                                )
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

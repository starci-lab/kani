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
    JitterService,
    RetryService,
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    LiquidityPoolNoWsIdleTimeoutException 
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
    Whirlpool 
} from "./beets"
import {
    address 
} from "@solana/kit"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AccountKind,
    RpcExecutorService,
    SolanaFetchService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    DayjsService 
} from "@modules/mixin"

/**
 * Observes Orca CLMM pools: fetches pool state on an interval and via WebSocket, updates cache and emits ClmmLiquidityPoolsSynced.
 *
 * @example
 * await orcaObserverService.onModuleInit()
 * // then onApplicationBootstrap starts interval and WS subscriptions
 */
@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap, OnModuleInit {
    // Snapshot here to reduce the computational complexity
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
        private readonly jitterService: JitterService,
    ) {}

    /**
     * Initializes observer: wait for primary memory storage, build local pool map for Orca pools.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // fetch all Orca liquidity pools from primary memory storage
        const liquidityPools = Array.from(this.primaryMemoryStorageService.liquidityPoolMap.values()).filter(
            (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Orca).toString(),
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
     * Runs on interval: fetches pool info for all Orca pools and updates cache/events.
     */
    @Interval(envConfig().dexes.orca.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            promises.push(
                (async () => {
                    await this.jitterService.delayWithJitter(
                        envConfig().dexes.orca.interval.observer.fetch
                    )
                    await this.fetchPoolInfo(liquidityPool)
                })()
            )
        }
        // Execute all fetch operations concurrently, ignoring individual errors
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Builds cache result from on-chain state, writes to cache and emits ClmmLiquidityPoolsSynced.
     *
     * @param liquidityPool - Pool schema being updated
     * @param state - Parsed Whirlpool state from chain
     */
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: ReturnType<typeof Whirlpool.struct["read"]>,
    ): Promise<void> {
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

        await this.asyncService.allIgnoreError([
            this.cacheManager.set(
                {
                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
                    args: [liquidityPool.id],
                    cacheResult: parsed,
                }
            ),
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
        this.winstonService.log(
            WinstonLog.LiquidityPoolUpdated,
            {
                liquidityPoolId: liquidityPool.displayId,
            }
        )
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
                dexId: DexId.Orca,
                liquidityPool,
            })
            const state = Whirlpool.struct.read(Buffer.from(accountInfo.data),
                8)
            return await this.handlePoolStateUpdate(liquidityPool,
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

                            for await (const accountNotification of accountNotifications) {
                                const state = Whirlpool.struct.read(
                                    Buffer.from(accountNotification.value?.data.toString(),
                                        "base64"),
                                    8,
                                )
                                resetTimeout()
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
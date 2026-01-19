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
} from "@modules/utils"
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

    async onModuleInit() {
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Meteora).toString(),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "meteora-observer-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "dex"],
            }
        )
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    // fetch the pool every 10s to ensure if no event from websocket
    @Interval(envConfig().dexes.meteora.interval.observer.fetch)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
    // ============================================
    // Main bootstrap
    // ============================================
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval().then(() => {
            for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
                this.observeDlmmPool(liquidityPool)
            }
        })
    }

    // ============================================
    // Shared handler for new pool state
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: ReturnType<(typeof LbPair.struct)["read"]>,
    ) {
        const dynamicDlmmLiquidityPoolInfo: DynamicDlmmLiquidityPoolInfoCacheResult =
        {
            activeId: state.active_id,
            rewards: state.reward_infos
                .filter((reward) => reward.mint.toString() !== "11111111111111111111111111111111") // Filter out empty rewards
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
        await this.asyncService.allIgnoreError([
            // cache
            this.cacheService.set(
                {
                    key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                    args: [liquidityPool.id],
                    cacheResult: dynamicDlmmLiquidityPoolInfo,
                }
            ),
            // event
            this.eventEmitterService.emit(
                EventName.DlmmLiquidityPoolsSynced,
                {
                    id: liquidityPool.id,
                    ...dynamicDlmmLiquidityPoolInfo
                }
            ),
        ])
        return state
    }

    // ============================================
    // Fetch once
    // ============================================
    private async fetchPoolInfo(liquidityPool: LiquidityPoolSchema) {
        try {
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
            if (!accountInfo || !accountInfo.exists)
                throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.Pool,
                    address: liquidityPool.poolAddress,
                    dexId: DexId.Meteora,
                    liquidityPoolId: liquidityPool.displayId,
                })
            const state = LbPair.struct.read(Buffer.from(accountInfo.data),
                8)
            return await this.handlePoolStateUpdate(
                liquidityPool,
                state
            )
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

    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeDlmmPool(liquidityPool: LiquidityPoolSchema) {
        try {
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException({
                    displayId: liquidityPool.displayId,
                })
            }
            // infinite loop to observe the pool
            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                timeout = setTimeout(() => abortController.abort(),
                    liquidityPool.wsIdleTimeoutMs
                )
            }
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
                                for await (const accountNotification of accountNotifications) {
                                    const state = LbPair.struct.read(
                                        Buffer.from(
                                            accountNotification.value?.data.toString(),
                                            "base64",
                                        ),
                                        8,
                                    )
                                    resetTimeout()
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
            this.winstonService.log(WinstonLog.LiquidityPoolWsError,
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                })
        }
    }
}

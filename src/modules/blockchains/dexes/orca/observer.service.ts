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

@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap, OnModuleInit {
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

    async onModuleInit() {
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Orca).toString(),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "orca-observer-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    // ============================================
    // Main bootstrap
    // ============================================
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval().then(() => {
            // observe
            for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
                this.observeClmmPool(liquidityPool.displayId)
            }
        })
    }

    @Interval(envConfig().dexes.orca.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })()
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
    // ============================================
    // Shared handler
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: ReturnType<typeof Whirlpool.struct["read"]>
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: new BN(state.tickCurrentIndex),
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPrice),
            rewards: state.rewardInfos
                .filter((reward) => reward.mint.toString() !== "11111111111111111111111111111111") // Filter out empty rewards
                .map((reward) => ({
                    tokenAddress: reward.mint.toString(),
                    emissionPerSecond: new BN(reward.emissionsPerSecondX64),
                    growthGlobal: new BN(reward.growthGlobalX64),
                })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobalA),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobalB),
            snapshotAt: this.dayjsService.now(),
        }
        await this.asyncService.allIgnoreError([
            // store in cache
            this.cacheManager.set(
                {
                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
                    args: [liquidityPool.id],
                    cacheResult: parsed,
                }
            ),
            // emit event through event emitter
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

    // ============================================
    // Fetch once
    // ============================================
    private async fetchPoolInfo(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
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
            if (!accountInfo || !accountInfo.exists) 
                throw new LiquidityPoolNotFoundException(
                    {
                        displayId: liquidityPool.displayId,
                    }
                )
            const state = Whirlpool.struct.read(Buffer.from(accountInfo.data),
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
    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeClmmPool(
        liquidityPoolId: LiquidityPoolId
    ) {
        try {
            const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
                {
                    id: liquidityPoolId,
                }
            )
            if (!liquidityPool) 
                throw new LiquidityPoolNotFoundException(
                    {
                        id: liquidityPoolId,
                    }
                )
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException(
                    {
                        displayId: liquidityPool.displayId,
                    }
                )
            }
            // infinite loop to ensure the connection is alive
            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout)
                }
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
                                    8
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
                    liquidityPoolId,
                    error: error.message,
                }
            )
        }
    }
}
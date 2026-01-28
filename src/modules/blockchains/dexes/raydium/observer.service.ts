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
    SolanaAccountNotFoundException, ErrorSolanaAccountName
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
    Interval 
} from "@nestjs/schedule"
import {
    address, fetchEncodedAccount 
} from "@solana/kit"
import {
    PublicKey 
} from "@solana/web3.js"
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

@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap, OnModuleInit {
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

    async onModuleInit() {
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
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "raydium-observer-liquidity-pools", 
        )
        this.liquidityPoolCollection.insert(liquidityPools)
    }
    // ============================================
    // Main bootstrap
    // ============================================
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval()
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            this.observeClmmPool(liquidityPool)
        }
    }

    @Interval(envConfig().dexes.raydium.interval.observer.fetch)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                this.fetchPoolInfo(liquidityPool.displayId)
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    // ============================================
    // Shared handler for new pool state
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPool: LiquidityPoolSchema,
        state: PoolState
    ) {
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: new BN(state.tickCurrent),
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPriceX64),
            rewards: state.rewardInfos
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
        await this.asyncService.allIgnoreError(
            [
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
                    }
                ),
            ]
        )

        return parsed
    }

    // ============================================
    // Fetch once
    // ============================================
    private async fetchPoolInfo(
        liquidityPoolId: LiquidityPoolId
    ) {
        const liquidityPool = this.liquidityPoolCollection.findOne({
            id: {
                $eq: liquidityPoolId,
            },
        })
        if (!liquidityPool) throw new LiquidityPoolNotFoundException({
            displayId: liquidityPoolId,
        })
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const accountInfo = await fetchEncodedAccount(rpc,
                    address(liquidityPool.poolAddress),
                    {
                        commitment: "confirmed",
                    })
                if (!accountInfo || !accountInfo.exists) throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.Pool,
                    address: liquidityPool.poolAddress,
                    dexId: DexId.Raydium,
                    liquidityPoolId: liquidityPool.displayId,
                })
                const [state] = PoolState.struct.deserialize(Buffer.from(accountInfo.data),
                    8)
                return await this.handlePoolStateUpdate(liquidityPool,
                    state)
            },
        })

    }

    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeClmmPool(
        liquidityPool: LiquidityPoolSchema
    ) {
        try {
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException({
                    displayId: liquidityPool.displayId,
                })
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
                                const [state] = PoolState.struct.deserialize(
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
                        // never throw an error, if the rpc is not available, just retry
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

export interface RaydiumRewardInfo {
    rewardState: number;
    rewardClaimed: BN;
    creator: PublicKey;
    endTime: BN;
    openTime: BN;
    lastUpdateTime: BN;
    emissionsPerSecondX64: BN;
    rewardTotalEmissioned: BN;
    tokenMint: PublicKey;
    tokenVault: PublicKey;
    rewardGrowthGlobalX64: BN;
}
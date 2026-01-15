import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { 
    CacheKey, 
    InjectRedisCache, 
    createCacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
} from "@modules/cache"
import BN from "bn.js"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { AsyncService, InjectSuperJson, RetryService } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { Whirlpool } from "./beets"
import { address, fetchEncodedAccount } from "@solana/kit"
import { envConfig } from "@modules/env"
import { Interval } from "@nestjs/schedule"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
    ) {}

    // ============================================
    // Main bootstrap
    // ============================================
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval().then(() => {
            // observe
            for (const liquidityPool of this.primaryMemoryStorageService.liquidityPools) {
                if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) continue
                this.observeClmmPool(liquidityPool.displayId)
            }
        })
    }

    @Interval(envConfig().timeConfig.interval.poolStateUpdate)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.primaryMemoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) continue
            promises.push(
                (
                    async () => {
                        await this.fetchPoolInfo(liquidityPool.displayId)
                    })()
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
    // ============================================
    // Shared handler
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
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
                createCacheKey(
                    CacheKey.DynamicClmmLiquidityPoolInfo, 
                    liquidityPoolId
                ),
                this.superjson.stringify(parsed),
                envConfig().cache.ttl.poolState,
            ),
            // emit event through event emitter
            this.eventEmitterService.emit<ClmmLiquidityPoolsFetchedEvent>(
                EventName.ClmmLiquidityPoolsFetched,
                { liquidityPoolId, ...parsed },
                { withoutLocal: true },
            ),
        ])

        return parsed
    }

    // ============================================
    // Fetch once
    // ============================================
    private async fetchPoolInfo(
        liquidityPoolId: LiquidityPoolId
    ) {
        try {
            const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
                (pool) => pool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) 
                throw new LiquidityPoolNotFoundException(
                    `Liquidity pool ${liquidityPoolId} not found`
                )
            const accountInfo = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await fetchEncodedAccount(
                        rpc, 
                        address(liquidityPool.poolAddress), {
                            commitment: "confirmed",
                        })
                },
            })
            if (!accountInfo || !accountInfo.exists) 
                throw new LiquidityPoolNotFoundException(
                    `Liquidity pool ${liquidityPoolId} not found`
                )
            const state = Whirlpool.struct.read(Buffer.from(accountInfo.data), 8)
            await this.handlePoolStateUpdate(liquidityPoolId, state)
        } catch (error) {
            this.winstonLogger.error(
                WinstonLog.FetchClmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                })
        }
    }
    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeClmmPool(
        liquidityPoolId: LiquidityPoolId
    ) {
        try {
            const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
                (pool) => pool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) 
                throw new LiquidityPoolNotFoundException(
                    `Liquidity pool ${liquidityPoolId} not found`
                )
            // infinite loop to ensure the connection is alive
            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                timeout = setTimeout(() => abortController.abort(), envConfig().timeConfig.ws.solanaRpcIdleTimeout)
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
                                    Buffer.from(accountNotification.value?.data.toString(), "base64"), 8
                                )
                                resetTimeout()
                                await this.handlePoolStateUpdate(liquidityPoolId, state)
                            }
                        },
                        options: {
                            retries: Infinity,
                        },
                    })
                }
            })
        } catch (error) {
            this.winstonLogger.error(
                WinstonLog.ObserveClmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                }
            )
        }
    }
}
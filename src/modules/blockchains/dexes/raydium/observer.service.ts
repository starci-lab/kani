import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    CacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
    InjectRedisCache,
    createCacheKey
} from "@modules/cache"
import BN from "bn.js"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { AsyncService, DayjsService, InjectSuperJson, RetryService } from "@modules/mixin"
import { LiquidityPoolNotFoundException, LiquidityPoolNoWsIdleTimeoutException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { ClmmLiquidityPoolsFetchedEvent, EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { Interval } from "@nestjs/schedule"
import { address, fetchEncodedAccount } from "@solana/kit"
import { PublicKey } from "@solana/web3.js"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import { PoolState } from "./beets"

@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
    ) { }

    // ============================================
    // Main bootstrap
    // ============================================
    onApplicationBootstrap() {
        this.handlePoolStateUpdateInterval().then(() => {
            for (const liquidityPool of this.memoryStorageService.liquidityPools) {
                if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) continue
                this.observeClmmPool(liquidityPool.displayId)
            }
        })
    }

    @Interval(envConfig().timeConfig.interval.poolStateUpdate)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) continue
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
    // Shared handler for new pool state
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
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
                })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobal0X64.toString()),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobal1X64.toString()),
            snapshotAt: this.dayjsService.now(),
        }
        await this.asyncService.allIgnoreError(
            [
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
        try {
            const liquidityPool = this.memoryStorageService.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    const accountInfo = await fetchEncodedAccount(rpc, address(liquidityPool.poolAddress), {
                        commitment: "confirmed",
                    })
                    if (!accountInfo || !accountInfo.exists) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
                    const [state] = PoolState.struct.deserialize(Buffer.from(accountInfo.data), 8)
                    return await this.handlePoolStateUpdate(liquidityPoolId, state)
                },
            })
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
            const liquidityPool = this.memoryStorageService.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            if (!liquidityPool.wsIdleTimeoutMs) {
                throw new LiquidityPoolNoWsIdleTimeoutException(
                    liquidityPoolId,
                    "Liquidity pool has no WS idle timeout"
                )
            }
            // infinite loop to ensure the connection is alive
            const abortController = new AbortController()
            let timeout: NodeJS.Timeout | undefined = undefined
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                timeout = setTimeout(() => abortController.abort(), liquidityPool.wsIdleTimeoutMs)
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
                                    Buffer.from(accountNotification.value?.data.toString(), "base64"), 8
                                )
                                resetTimeout()
                                await this.handlePoolStateUpdate(liquidityPoolId, state)
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
            this.winstonLogger.error(
                WinstonLog.ObserveClmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                })
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
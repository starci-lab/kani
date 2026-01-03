import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { CacheKey, InjectRedisCache, createCacheKey } from "@modules/cache"
import BN from "bn.js"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { Whirlpool } from "./beets"
import { address, fetchEncodedAccount } from "@solana/kit"
import { envConfig } from "@modules/env"
import { Interval } from "@nestjs/schedule"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"

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
        const parsed = {
            tickCurrent: state.tickCurrentIndex,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPrice),
        }

        await this.asyncService.allIgnoreError([
            // cache
            this.cacheManager.set(
                createCacheKey(
                    CacheKey.DynamicLiquidityPoolInfo, 
                    liquidityPoolId
                ),
                this.superjson.stringify(parsed),
                envConfig().cache.ttl.poolState,
            ),
            // event emit
            this.eventEmitterService.emit(
                EventName.LiquidityPoolsFetched,
                { liquidityPoolId, ...parsed },
                { withoutLocal: true },
            ),
        ])

        // logging
        this.winstonLogger.debug(WinstonLog.ObserveClmmPool, {
            liquidityPoolId,
            tickCurrent: parsed.tickCurrent.toString(),
            liquidity: parsed.liquidity.toString(),
            sqrtPriceX64: parsed.sqrtPriceX64.toString(),
        })

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
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            const accountInfo = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    return await fetchEncodedAccount(rpc, address(liquidityPool.poolAddress), {
                        commitment: "confirmed",
                    })
                },
            })
            if (!accountInfo || !accountInfo.exists) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
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
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
            // infinite loop to ensure the connection is alive
            while (true) {
                await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Read,
                    requiredWs: true,
                    callback: async ({ rpcSubscriptions }) => {
                        await this.asyncService.suppressErrorAfterTimeout(
                            async () => {
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
                                    const state = Whirlpool.struct.read(Buffer.from(accountNotification.value?.data.toString(), "base64"), 8)
                                    await this.handlePoolStateUpdate(liquidityPoolId, state)
                                }
                            },
                            envConfig().timeConfig.wsTimeout,
                        )
                    },
                })
            }
        } catch (error) {
            this.winstonLogger.error(
                WinstonLog.ObserveClmmPoolError, {
                    liquidityPoolId,
                    error: error.message,
                })
        }
    }
}
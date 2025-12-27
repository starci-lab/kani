import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    CacheKey,
    DynamicLiquidityPoolInfoCacheResult,
    InjectRedisCache,
    createCacheKey
} from "@modules/cache"
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
        private readonly events: EventEmitterService,
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
        const parsed: DynamicLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickCurrent,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPriceX64),
            rewards: state.rewardInfos.filter(
                rewardInfo => rewardInfo.tokenMint.toString() !== "11111111111111111111111111111111"
            ),
        }
        await this.asyncService.allIgnoreError(
            [
                // cache
                this.cacheManager.set(
                    createCacheKey(CacheKey.DynamicLiquidityPoolInfo, liquidityPoolId),
                    this.superjson.stringify(parsed),
                    envConfig().cache.ttl.poolState,
                ),
                // event
                this.events.emit(
                    EventName.LiquidityPoolsFetched,
                    { liquidityPoolId, ...parsed },
                    { withoutLocal: true },
                ),
            ]
        )
        // logging
        this.winstonLogger.debug(
            WinstonLog.ObserveClmmPool, {
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
            const liquidityPool = this.memoryStorageService.liquidityPools.find(
                liquidityPool => liquidityPool.displayId === liquidityPoolId,
            )
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    const accountInfo = await fetchEncodedAccount(rpc, address(liquidityPool.poolAddress), {
                        commitment: "confirmed",
                    })
                    if (!accountInfo || !accountInfo.exists) throw new LiquidityPoolNotFoundException(liquidityPoolId)
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
            if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Read,
                requiredWs: true,
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
                        const [state] = PoolState.struct.deserialize(Buffer.from(accountNotification.value?.data.toString(), "base64"), 8)
                        await this.handlePoolStateUpdate(liquidityPoolId, state)
                    }
                },
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
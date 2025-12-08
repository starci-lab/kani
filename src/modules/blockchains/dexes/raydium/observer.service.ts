import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { PoolInfoLayout } from "@raydium-io/raydium-sdk-v2"
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
    LoadBalancerName,
} from "@modules/databases"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { CronExpression } from "@nestjs/schedule"
import { Cron } from "@nestjs/schedule"
import { address, fetchEncodedAccount } from "@solana/kit"
import { PublicKey } from "@solana/web3.js"
import { ClientType, RpcPickerService } from "../../clients"

@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly rpcPickerService: RpcPickerService,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly events: EventEmitterService,
    ) { }

    // ============================================
    // Main bootstrap
    // ============================================
    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) continue
            this.observeClmmPool(liquidityPool.displayId)
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
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
        state: ReturnType<typeof PoolInfoLayout["decode"]>
    ) {
        const parsed: DynamicLiquidityPoolInfoCacheResult = {
            tickCurrent: state.tickCurrent,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.sqrtPriceX64),
            rewards: state.rewardInfos,
        }
        await this.asyncService.allIgnoreError(
            [
                // cache
                this.cacheManager.set(
                    createCacheKey(CacheKey.DynamicLiquidityPoolInfo, liquidityPoolId),
                    this.superjson.stringify(parsed),
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
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        await this.rpcPickerService.withSolanaRpc({
            clientType: ClientType.Read,
            mainLoadBalancerName: LoadBalancerName.RaydiumClmm,
            callback: async ({ rpc }) => {
                const accountInfo = await fetchEncodedAccount(rpc, address(liquidityPool.poolAddress), {
                    commitment: "confirmed",
                })
                if (!accountInfo || !accountInfo.exists) throw new LiquidityPoolNotFoundException(liquidityPoolId)
                const state = PoolInfoLayout.decode(Buffer.from(accountInfo.data))
                return await this.handlePoolStateUpdate(liquidityPoolId, state)
            },
        })
    }

    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeClmmPool(
        liquidityPoolId: LiquidityPoolId
    ) {
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        await this.rpcPickerService.withSolanaRpc({
            clientType: ClientType.Read,
            mainLoadBalancerName: LoadBalancerName.RaydiumClmm,
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
                    const state = PoolInfoLayout.decode(Buffer.from(accountNotification.value?.data.toString(), "base64"))
                    await this.handlePoolStateUpdate(liquidityPoolId, state)
                }
            },
        })
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
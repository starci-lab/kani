import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { CacheKey, InjectRedisCache, createCacheKey } from "@modules/cache"
import BN from "bn.js"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
    LoadBalancerName,
} from "@modules/databases"
import { AsyncService, InjectSuperJson, LoadBalancerService } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId, httpsToWss } from "@utils"
import { Whirlpool } from "./beets"
import { CronExpression, Cron } from "@nestjs/schedule"
import { address, createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit"

@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap, OnModuleInit {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly events: EventEmitterService,
    ) {}

    async onModuleInit() {
        for (
            const liquidityPool of this.memoryStorageService.liquidityPools
        ) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) continue
            await this.fetchPoolInfo(liquidityPool.displayId)
        }
    }
    // ============================================
    // Main bootstrap
    // ============================================
    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
        // observe
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) continue
            this.observeClmmPool(liquidityPool.displayId)
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    private async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
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
            ),
            // event emit
            this.events.emit(
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
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            (pool) => pool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.OrcaClmm, 
            this.memoryStorageService.clientConfig.orcaClmmClientRpcs.read
        )
        const rpc = createSolanaRpc(url)
        const accountInfo = await rpc.getAccountInfo(address(liquidityPool.poolAddress)).send()
        if (!accountInfo || !accountInfo.value?.data) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        const state = Whirlpool.struct.read(Buffer.from(accountInfo.value.data), 8)
        return await this.handlePoolStateUpdate(liquidityPoolId, state)
    }

    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeClmmPool(
        liquidityPoolId: LiquidityPoolId
    ) {
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            (pool) => pool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.OrcaClmm, 
            this.memoryStorageService.clientConfig.orcaClmmClientRpcs.read
        )
        const controller = new AbortController()
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(url))
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
    }
}
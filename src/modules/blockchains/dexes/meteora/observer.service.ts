import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {  } from "@meteora-ag/dlmm"
import { DynamicDlmmLiquidityPoolInfoCacheResult, InjectRedisCache } from "@modules/cache"
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
import { LbPair } from "./beets"
import { createCacheKey } from "@modules/cache"
import { CacheKey } from "@modules/cache"
import { Cron, CronExpression } from "@nestjs/schedule"
import { address, createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit"

@Injectable()
export class MeteoraObserverService implements OnApplicationBootstrap {
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
    ) { }

    // fetch the pool every 10s to ensure if no event from websocket
    @Cron(CronExpression.EVERY_10_SECONDS)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Meteora).toString()) continue
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
    // Main bootstrap
    // ============================================
    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
        for (const liquidityPool
            of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Meteora).toString()) continue
            this.observeDlmmPool(liquidityPool.displayId)
        }
    }

    // ============================================
    // Shared handler for new pool state
    // ============================================
    private async handlePoolStateUpdate(
        liquidityPoolId: LiquidityPoolId,
        state: ReturnType<typeof LbPair.struct["read"]>
    ) {
        const dynamicDlmmLiquidityPoolInfo: DynamicDlmmLiquidityPoolInfoCacheResult = {
            activeId: state.active_id,
            rewards: state.reward_infos,
        }
        await this.asyncService.allIgnoreError([
            // cache
            this.cacheManager.set(
                createCacheKey(CacheKey.DynamicDlmmLiquidityPoolInfo, liquidityPoolId),
                this.superjson.stringify(dynamicDlmmLiquidityPoolInfo),
            ),
            // event
            this.events.emit(
                EventName.DlmmLiquidityPoolsFetched,
                { liquidityPoolId, ...dynamicDlmmLiquidityPoolInfo },
                { withoutLocal: true },
            ),
        ])

        // logging
        this.winstonLogger.debug(
            WinstonLog.ObserveDlmmPool, {
                liquidityPoolId,
            })

        return state
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

        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.MeteoraDlmm, 
            this.memoryStorageService.clientConfig.meteoraDlmmClientRpcs.read
        )
        const rpc = createSolanaRpc(url)
        const accountInfo = await rpc.getAccountInfo(address(liquidityPool.poolAddress)).send()
        if (!accountInfo || !accountInfo.value?.data) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        const state = LbPair.struct.read(Buffer.from(accountInfo.value.data), 8)
        return await this.handlePoolStateUpdate(liquidityPoolId, state)
    }

    // ============================================
    // Observe (subscribe)
    // ============================================
    private async observeDlmmPool(
        liquidityPoolId: LiquidityPoolId
    ) {
        const liquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        const url = this.loadBalancerService.balanceP2c(
            LoadBalancerName.MeteoraDlmm, 
            this.memoryStorageService.clientConfig.meteoraDlmmClientRpcs.read)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(url))
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
            const state = LbPair.struct.read(Buffer.from(accountNotification.value?.data.toString(), "base64"), 8)
            await this.handlePoolStateUpdate(liquidityPoolId, state)
        }
    }
}
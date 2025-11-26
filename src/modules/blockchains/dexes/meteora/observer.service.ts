import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Network } from "@modules/common"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { Connection, PublicKey } from "@solana/web3.js"
import {  } from "@meteora-ag/dlmm"
import { DynamicDlmmLiquidityPoolInfoCacheResult, InjectRedisCache } from "@modules/cache"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { LbPair } from "./beets"
import { METEORA_CLIENTS_INDEX } from "./constants"
import { createCacheKey } from "@modules/cache"
import { CacheKey } from "@modules/cache"
import { Cron, CronExpression } from "@nestjs/schedule"

@Injectable()
export class MeteoraObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
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
        const promises: Array<Promise<void>> = []
        for (const liquidityPool
            of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Meteora).toString()) continue
            promises.push(
                (
                    async () => {
                        await this.observeDlmmPool(liquidityPool.displayId)
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

        const connection = this.solanaClients[liquidityPool.network].ws[METEORA_CLIENTS_INDEX]
        const accountInfo = await connection.getAccountInfo(new PublicKey(liquidityPool.poolAddress))
        if (!accountInfo) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        const state = LbPair.struct.read(accountInfo.data, 8)
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
        const connection = this.solanaClients[liquidityPool.network].ws[METEORA_CLIENTS_INDEX]
        connection.onAccountChange(new PublicKey(liquidityPool.poolAddress), async (accountInfo) => {
            const state = LbPair.struct.read(accountInfo.data, 8)
            await this.handlePoolStateUpdate(liquidityPoolId, state)
        })
    }
}
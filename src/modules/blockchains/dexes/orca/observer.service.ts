import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Network } from "@modules/common"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { Connection, PublicKey } from "@solana/web3.js"
import { ORCA_CLIENTS_INDEX } from "./constants"
import { CacheKey, InjectRedisCache, createCacheKey } from "@modules/cache"
import BN from "bn.js"
import {
    InjectPrimaryMongoose,
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { Connection as MongooseConnection } from "mongoose"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { Whirlpool } from "./beets"
import { CronExpression, Cron } from "@nestjs/schedule"

@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap, OnModuleInit {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
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
        const promises: Array<Promise<void>> = []
        // observe
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) continue
            promises.push(
                (
                    async () => {
                        await this.observeClmmPool(liquidityPool.displayId)
                    })()
            )
        }
        await this.asyncService.allIgnoreError(promises)  
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

        const connection =
            this.solanaClients[liquidityPool.network].ws[ORCA_CLIENTS_INDEX]
        const accountInfo = await connection.getAccountInfo(
            new PublicKey(liquidityPool.poolAddress),
        )
        if (!accountInfo) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        // skip discriminator = 8 bytes
        const state = Whirlpool.struct.read(accountInfo.data, 8)

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

        const connection =
            this.solanaClients[liquidityPool.network].ws[ORCA_CLIENTS_INDEX]

        connection.onAccountChange(
            new PublicKey(liquidityPool.poolAddress),
            async (accountInfo) => {
                const state = Whirlpool.struct.read(accountInfo.data, 8)
                await this.handlePoolStateUpdate(liquidityPoolId, state)
            },
        )
    }
}
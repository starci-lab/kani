import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Network } from "@modules/common"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { Connection, PublicKey } from "@solana/web3.js"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { PoolInfoLayout } from "@raydium-io/raydium-sdk-v2"
import { CacheKey, DynamicLiquidityPoolInfoCacheResult, InjectRedisCache, createCacheKey } from "@modules/cache"
import BN from "bn.js"
import {
    DynamicLiquidityPoolInfoSchema,
    InjectPrimaryMongoose,
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId
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

@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap, OnModuleInit {
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
    ) { }

    async onModuleInit() {
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) continue
            await this.fetchPoolInfo(liquidityPool.displayId)
        }
    }
    // ============================================
    // Main bootstrap
    // ============================================
    async onApplicationBootstrap() {
        for (const liquidityPool
            of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) continue
            this.observeClmmPool(liquidityPool.displayId)
        }
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
        await this.asyncService.allIgnoreError([
            // cache
            this.cacheManager.set(
                createCacheKey(CacheKey.DynamicLiquidityPoolInfo, liquidityPoolId),
                this.superjson.stringify(parsed),
            ),

            // db insert
            this.connection.model(DynamicLiquidityPoolInfoSchema.name).create({
                liquidityPool: createObjectId(liquidityPoolId),
                ...parsed,
            }),

            // event
            this.events.emit(
                EventName.LiquidityPoolsFetched,
                { liquidityPoolId, ...parsed },
                { withoutLocal: true },
            ),
        ])

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

        const connection = this.solanaClients[liquidityPool.network].ws[RAYDIUM_CLIENTS_INDEX]
        const accountInfo = await connection.getAccountInfo(new PublicKey(liquidityPool.poolAddress))
        if (!accountInfo) throw new LiquidityPoolNotFoundException(liquidityPoolId)

        const state = PoolInfoLayout.decode(accountInfo.data)
        return await this.handlePoolStateUpdate(liquidityPoolId, state)
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

        const connection = this.solanaClients[liquidityPool.network].ws[RAYDIUM_CLIENTS_INDEX]

        connection.onAccountChange(new PublicKey(liquidityPool.poolAddress), async (accountInfo) => {
            const state = PoolInfoLayout.decode(accountInfo.data)
            await this.handlePoolStateUpdate(liquidityPoolId, state)
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
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { LiquidityPoolService } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { EventEmitterService, EventName } from "@modules/event"
import { RandomDelayService } from "@modules/mixin"
import { LiquidityPoolEntity, LiquidityPoolLike, MemDbService, TokenLike, TokenEntity, MemDbQueryService } from "@modules/databases"
import { ModuleRef } from "@nestjs/core"
import { envConfig, LpBotType } from "@modules/env"
import { DataSource } from "typeorm"

@Injectable()
export class FetcherService implements OnModuleInit {
    private tokens: Array<TokenLike> = []
    private liquidityPools: Array<LiquidityPoolLike> = []

    constructor(
        private readonly lpPoolService: LiquidityPoolService,
        @InjectWinston()
        private readonly logger: Logger,
        @InjectRedisCache()
        private readonly redisCacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly randomDelayService: RandomDelayService,
        private readonly moduleRef: ModuleRef,
    ) { }

    async onModuleInit() {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            const memDbService = this.moduleRef.get(MemDbService)
            const memDbQueryService = this.moduleRef.get(MemDbQueryService)
            this.tokens = memDbService.tokens
            this.liquidityPools = memDbService.liquidityPools.map(liquidityPool => ({
                ...liquidityPool,
                dex: memDbQueryService.findDexById(liquidityPool.dex.toString()),
                tokenA: memDbQueryService.findTokenById(liquidityPool.tokenA.toString()),
                tokenB: memDbQueryService.findTokenById(liquidityPool.tokenB.toString()),
                tokenAId: memDbQueryService.findTokenById(liquidityPool.tokenA.toString())!.displayId,
                tokenBId: memDbQueryService.findTokenById(liquidityPool.tokenB.toString())!.displayId,
                dexId: memDbQueryService.findDexById(liquidityPool.dex.toString())!.displayId,
            }))
            break
        }
        case LpBotType.System: {
            const dataSource = this.moduleRef.get(DataSource)
            this.tokens = await dataSource.manager.find(TokenEntity)
            this.liquidityPools = await dataSource.manager.find(LiquidityPoolEntity)
            break
        }
            break
        }
    }

    // we fetch pools each 3s
    @Cron("*/3 * * * * *")
    async fetchPools() {
        Object.values(ChainId).flatMap((chainId) =>
            Object.values(Network).map(async (network) => {
                await this.randomDelayService.waitRandom()
                return this.fetchPoolsByChain(chainId, network)
            }),
        )
    }

    private async fetchPoolsByChain(
        chainId: ChainId,
        network: Network = Network.Mainnet,
    ) {
        if (network === Network.Testnet) {
            // testnet is not supported
            return
        }
        const dexes = await this.lpPoolService.getDexs({
            chainId,
        })
        for (const dex of dexes) {
            const { pools } = await dex.fetcher.fetchPools({
                network,
                liquidityPools: this.liquidityPools,
                tokens: this.tokens,
            })
            // we write a log
            this.logger.info(
                "FetchedPools", 
                {
                    chainId,
                    dex: dex.dexId,
                    network,
                    poolCount: pools.length,
                })
            // we store in cache
            await this.redisCacheManager.set(
                createCacheKey(
                    CacheKey.LiquidityPools,
                    {
                        dexId: dex.dexId,
                        chainId,
                        network,
                    }),
                pools,
            )
            // we broadcast the events
            this.eventEmitterService.emit(EventName.LiquidityPoolsFetched, {
                pools,
            })
        }
    }
}

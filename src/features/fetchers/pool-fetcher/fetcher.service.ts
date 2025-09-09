import { Injectable } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { LiquidityPoolService } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { EventEmitterService, EventName } from "@modules/event"
import { RandomDelayService } from "@modules/mixin"
import { ModuleRef } from "@nestjs/core"
import { DataLikeService } from "../data-like"

@Injectable()
export class FetcherService {
    private cacheManager: Cache
    private dataLikeService: DataLikeService

    constructor(
        private readonly liquidityPoolService: LiquidityPoolService,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly cacheHelpersService: CacheHelpersService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly randomDelayService: RandomDelayService,
        private readonly moduleRef: ModuleRef,
    ) {
        this.cacheManager = this.cacheHelpersService.getCacheManager({ autoSelect: true })
        this.dataLikeService = this.moduleRef.get(DataLikeService,{strict: false})
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
        const dexes = await this.liquidityPoolService.getDexs({
            chainId,
        })
        for (const dex of dexes) {
            const { pools } = await dex.fetcher.fetchPools({
                network,
                liquidityPools: this.dataLikeService.liquidityPools,
                tokens: this.dataLikeService.tokens,
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
            await this.cacheManager.set(
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

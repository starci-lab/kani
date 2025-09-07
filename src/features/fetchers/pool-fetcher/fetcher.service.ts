import { Injectable } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { LpPoolService } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { EventEmitterService, EventName } from "@modules/event"
import { RandomDelayService } from "@modules/mixin"

@Injectable()
export class FetcherService {
    constructor(
        private readonly lpPoolService: LpPoolService,
        @InjectWinston()
        private readonly logger: Logger,
        @InjectRedisCache()
        private readonly redisCacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly randomDelayService: RandomDelayService,
    ) { }

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
                    CacheKey.LpPools,
                    {
                        dexId: dex.dexId,
                        chainId,
                        network,
                    }),
                pools,
            )
            // we broadcast the events
            this.eventEmitterService.emit(EventName.LpPoolsFetched, {
                pools,
            })
        }
    }
}

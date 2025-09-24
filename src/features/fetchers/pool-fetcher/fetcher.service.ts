import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { LiquidityPoolService } from "@modules/blockchains"
import { ChainId, Network, waitUntil } from "@modules/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger } from "winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { EventEmitterService, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { AsyncService, InjectSuperJson, RandomDelayService } from "@modules/mixin"
import { DataLikeService } from "../data-like"
import { FetchedPool } from "@modules/blockchains"
import SuperJSON from "superjson"

@Injectable()
export class PoolFetcherService implements OnModuleInit, OnApplicationBootstrap {
    private cacheManager: Cache

    constructor(
        private readonly liquidityPoolService: LiquidityPoolService,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly cacheHelpersService: CacheHelpersService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly randomDelayService: RandomDelayService,
        private readonly asyncService: AsyncService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dataLikeService: DataLikeService,
    ) {}

    onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({ autoSelect: true })
    }

    // we fetch pools when the application bootstraps
    onApplicationBootstrap() {
        this.fetchPools()
    }

    // we fetch pools each 5s
    @Cron("*/5 * * * * *")
    async fetchPools() {
        await waitUntil(() => this.dataLikeService.loaded)
        const promises = Object.values(ChainId).flatMap((chainId) =>
            Object.values(Network).map(async (network) => {
                await this.randomDelayService.waitRandom()
                return this.fetchPoolsByChain(chainId, network)
            }),
        )
        await Promise.all(promises)
    }

    private async fetchPoolsByChain(
        chainId: ChainId,
        network: Network = Network.Mainnet,
    ) {
        if (network === Network.Testnet) {
            // testnet is not supported
            return
        }
        const dexes 
        = await this.liquidityPoolService.getDexs({
            chainId,
        }) || []
        const promises: Array<Promise<void>> = []
        const fetchedPools: Array<FetchedPool> = []
        for (const dex of dexes) {
            promises.push((async () => {
                try {
                    const { pools } = await dex.fetcher.fetchPools({
                        network,
                        liquidityPools: this.dataLikeService.liquidityPools,
                        tokens: this.dataLikeService.tokens,
                    })
                    fetchedPools.push(...pools)
                    // we write a log
                    this.logger.debug(
                        WinstonLog.FetchedPools, 
                        {
                            chainId,
                            dex: dex.dexId,
                            network,
                            pools: pools.map(
                                pool => ({
                                    poolAddress: pool.poolAddress,
                                    currentSqrtPrice: pool.currentSqrtPrice,
                                    currentTick: pool.currentTick,
                                })
                            ),
                        })
                } catch (error) {
                    this.logger.error(
                        WinstonLog.FetchedPoolsError,
                        {
                            chainId,
                            dex: dex.dexId,
                            network,
                            message: error.message,
                            stack: error.stack,
                        })
                }
            })())
        }
        await this.asyncService.allIgnoreError(promises)
        // we store in cache
        await this.cacheManager.set(
            createCacheKey(
                CacheKey.LiquidityPools,
                {
                    chainId,
                    network,
                }),
            this.superjson.stringify(fetchedPools),
        )
        // we broadcast the events
        this.eventEmitterService.emit<LiquidityPoolsFetchedEvent>(
            EventName.LiquidityPoolsFetched, 
            {
                chainId,
                network,
                pools: this.superjson.stringify(fetchedPools),
            }
        )
    }
}

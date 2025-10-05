import { Injectable } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"
import { LiquidityPoolService, FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger } from "winston"
import { CacheKey, CacheManagerService, createCacheKey } from "@modules/cache"
import { EventEmitterService, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { AsyncService, InjectSuperJson, LockService, RetryService } from "@modules/mixin"
import SuperJSON from "superjson"

@Injectable()
export class PoolFetcherService {
    constructor(
        private readonly liquidityPoolService: LiquidityPoolService,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly cacheManagerService: CacheManagerService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly asyncService: AsyncService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly lockService: LockService,
        private readonly retryService: RetryService,
    ) { }

    // bootstrap → fetch once
    onApplicationBootstrap() {
        this.fetchPools()
    }

    // schedule → every 5s
    @Interval(5000)
    async fetchPools() {
        const lockKey = "pool-fetcher"
        await this.lockService.withLocks({
            blockedKeys: [lockKey],
            acquiredKeys: [lockKey],
            releaseKeys: [lockKey],
            callback: async () => {
                const tasks = Object.values(ChainId).flatMap((chainId) =>
                    Object.values(Network).map((network) =>
                        this.fetchPoolsByChain(chainId, network)
                    ),
                )
                await this.asyncService.allIgnoreError(tasks)
            }
        })
    }

    private async fetchPoolsByChain(
        chainId: ChainId,
        network: Network = Network.Mainnet,
    ) {
        if (network === Network.Testnet) {
            // skip unsupported
            return
        }

        const dexes = (await this.liquidityPoolService.getDexs({ chainId })) || []
        const fetchedPools: Array<FetchedPool> = []

        const tasks = dexes.map(async (dex) => {
            try {
                // retry fetcher per dex
                const { pools } = await this.retryService.retry({
                    action: async () => {
                        return dex.fetcher.fetchPools({
                            network,
                        })
                    },
                    // five times retry with 1 second delay, to ensure the fetcher is always successful and not rate limited
                    maxRetries: 10,
                    delay: 500,
                })
                fetchedPools.push(...pools)
                this.logger.debug(WinstonLog.FetchedPools, {
                    chainId,
                    dex: dex.dexId,
                    network,
                    pools: pools.map(pool => ({
                        poolAddress: pool.poolAddress,
                        currentSqrtPrice: pool.currentSqrtPrice,
                        currentTick: pool.currentTick,
                    })),
                })
            } catch (error) {
                this.logger.error(WinstonLog.FetchedPoolsError, {
                    chainId,
                    dex: dex.dexId,
                    network,
                    message: error.message,
                    stack: error.stack,
                })
            }
        })

        await this.asyncService.allIgnoreError(tasks)

        // store aggregated pools in cache
        await this.cacheManagerService.set({
            key: createCacheKey(CacheKey.LiquidityPools, { chainId, network }),
            value: this.superjson.stringify(fetchedPools),
        })

        // broadcast event
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
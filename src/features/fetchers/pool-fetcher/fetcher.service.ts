import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"
import { LiquidityPoolService, FetchedPool } from "@modules/blockchains"
import { ChainId, Network, waitUntil } from "@modules/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger } from "winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { EventEmitterService, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { AsyncService, InjectSuperJson, LockService, RetryService } from "@modules/mixin"
import { DataLikeService } from "../data-like"
import SuperJSON from "superjson"
import { UserLoaderService } from "../user-loader"

@Injectable()
export class PoolFetcherService implements OnModuleInit, OnApplicationBootstrap {
    private cacheManager: Cache

    constructor(
    private readonly liquidityPoolService: LiquidityPoolService,
    @InjectWinston()
    private readonly logger: Logger,
    private readonly cacheHelpersService: CacheHelpersService,
    private readonly eventEmitterService: EventEmitterService,
    private readonly asyncService: AsyncService,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly dataLikeService: DataLikeService,
    private readonly userLoaderService: UserLoaderService,
    private readonly lockService: LockService,
    private readonly retryService: RetryService,
    ) {}

    onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({ autoSelect: true })
    }

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
                await waitUntil(() => this.dataLikeService.loaded && this.userLoaderService.loaded)

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
                          liquidityPools: this.dataLikeService.liquidityPools,
                          tokens: this.dataLikeService.tokens,
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
      await this.cacheManager.set(
          createCacheKey(CacheKey.LiquidityPools, { chainId, network }),
          this.superjson.stringify(fetchedPools),
      )

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
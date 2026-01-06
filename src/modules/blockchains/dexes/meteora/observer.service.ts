import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    DynamicDlmmLiquidityPoolInfoCacheResult,
    InjectRedisCache,
} from "@modules/cache"
import {
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import { AsyncService, DayjsService, InjectSuperJson } from "@modules/mixin"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { createObjectId } from "@utils"
import { LbPair } from "./beets"
import { createCacheKey } from "@modules/cache"
import { CacheKey } from "@modules/cache"
import { Interval } from "@nestjs/schedule"
import { address, fetchEncodedAccount } from "@solana/kit"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class MeteoraObserverService implements OnApplicationBootstrap {
    constructor(
    @InjectWinston()
    private readonly winstonLogger: WinstonLogger,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly memoryStorageService: PrimaryMemoryStorageService,
    private readonly asyncService: AsyncService,
    private readonly eventEmitterService: EventEmitterService,
    private readonly dayjsService: DayjsService,
    ) {}

  // fetch the pool every 10s to ensure if no event from websocket
  @Interval(envConfig().timeConfig.interval.poolStateUpdate)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (
                liquidityPool.dex.toString() !==
        createObjectId(DexId.Meteora).toString()
            )
                continue
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool.displayId)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
  // ============================================
  // Main bootstrap
  // ============================================
  onApplicationBootstrap() {
      this.handlePoolStateUpdateInterval().then(() => {
          for (const liquidityPool of this.memoryStorageService.liquidityPools) {
              if (
                  liquidityPool.dex.toString() !==
          createObjectId(DexId.Meteora).toString()
              )
                  continue
              this.observeDlmmPool(liquidityPool.displayId)
          }
      })
  }

  // ============================================
  // Shared handler for new pool state
  // ============================================
  private async handlePoolStateUpdate(
      liquidityPoolId: LiquidityPoolId,
      state: ReturnType<(typeof LbPair.struct)["read"]>,
  ) {
      const dynamicDlmmLiquidityPoolInfo: DynamicDlmmLiquidityPoolInfoCacheResult =
      {
          activeId: state.active_id,
          rewards: state.reward_infos,
          snapshotAt: this.dayjsService.now(),
      }
      await this.asyncService.allIgnoreError([
      // cache
          this.cacheManager.set(
              createCacheKey(CacheKey.DynamicDlmmLiquidityPoolInfo, liquidityPoolId),
              this.superjson.stringify(dynamicDlmmLiquidityPoolInfo),
              envConfig().cache.ttl.poolState,
          ),
          // event
          this.eventEmitterService.emit(
              EventName.DlmmLiquidityPoolsFetched,
              { liquidityPoolId, ...dynamicDlmmLiquidityPoolInfo },
              { withoutLocal: true },
          ),
      ])

      // logging
      this.winstonLogger.debug(WinstonLog.ObserveDlmmPool, {
          liquidityPoolId,
      })
      return state
  }

  // ============================================
  // Fetch once
  // ============================================
  private async fetchPoolInfo(liquidityPoolId: LiquidityPoolId) {
      try {
          const liquidityPool = this.memoryStorageService.liquidityPools.find(
              (liquidityPool) => liquidityPool.displayId === liquidityPoolId,
          )
          if (!liquidityPool)
              throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)

          const accountInfo = await this.rpcExecutorService.withSolanaRpc({
              accessType: RpcAccessType.Read,
              callback: async ({ rpc }) => {
                  return await fetchEncodedAccount(
                      rpc,
                      address(liquidityPool.poolAddress),
                      {
                          commitment: "confirmed",
                      },
                  )
              },
          })
          if (!accountInfo || !accountInfo.exists)
              throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
          const state = LbPair.struct.read(Buffer.from(accountInfo.data), 8)
          return await this.handlePoolStateUpdate(liquidityPoolId, state)
      } catch (error) {
          this.winstonLogger.error(WinstonLog.FetchDlmmPoolError, {
              liquidityPoolId,
              error: error.message,
          })
      }
  }

  // ============================================
  // Observe (subscribe)
  // ============================================
  private async observeDlmmPool(liquidityPoolId: LiquidityPoolId) {
      try {
          const liquidityPool = this.memoryStorageService.liquidityPools.find(
              (liquidityPool) => liquidityPool.displayId === liquidityPoolId,
          )
          if (!liquidityPool)
              throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
          // infinite loop to observe the pool
          while (true) {
              await this.rpcExecutorService.withSolanaRpc({
                  accessType: RpcAccessType.Read,
                  requiredWs: true,
                  callback: async ({ rpcSubscriptions }) => {
                      await this.asyncService.suppressErrorAfterTimeout(async () => {
                          const controller = new AbortController()
                          const accountNotifications = await rpcSubscriptions
                              .accountNotifications(address(liquidityPool.poolAddress), {
                                  commitment: "confirmed",
                                  encoding: "base64",
                              })
                              .subscribe({
                                  abortSignal: controller.signal,
                              })
                          for await (const accountNotification of accountNotifications) {
                              const state = LbPair.struct.read(
                                  Buffer.from(
                                      accountNotification.value?.data.toString(),
                                      "base64",
                                  ),
                                  8,
                              )
                              await this.handlePoolStateUpdate(liquidityPoolId, state)
                          }
                      }, envConfig().timeConfig.wsTimeout)
                  },
              })
          }
      } catch (error) {
          this.winstonLogger.error(WinstonLog.ObserveDlmmPoolError, {
              liquidityPoolId,
              error: error.message,
          })
      }
  }
}

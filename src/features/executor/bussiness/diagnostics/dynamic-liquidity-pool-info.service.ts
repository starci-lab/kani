import {
    Injectable,
    OnModuleInit,
    OnApplicationBootstrap,
} from "@nestjs/common"
import type {
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    LiquidityPoolType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    AsyncService,
    DayjsService,
    LokiJSService,
} from "@modules/mixin"
import {
    CacheKey, CacheService 
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"
import {
    Collection,
} from "lokijs"
import type {
    DynamicLiquidityPoolInfoDiagnosticReadinessResult,
} from "../types"

/**
 * DynamicLiquidityPoolInfoDiagnosticService
 *
 * Diagnostics for dynamic liquidity pool snapshot availability.
 *
 * Mirrors `PriceDiagnosticService` behavior:
 * - On bootstrap, runs once immediately to populate the first snapshot
 * - On interval, refreshes results for each active pool
 * - Validates cache presence + staleness for the pool's dynamic snapshot
 * - Logs stale / not-found / error details (does NOT throw)
 * - Stores last run results in `this.results` for later inspection
 */
@Injectable()
export class DynamicLiquidityPoolInfoDiagnosticService implements OnModuleInit, OnApplicationBootstrap {
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    // Latest diagnostics snapshot (one entry per liquidityPoolId).
    private results: Collection<DynamicLiquidityPoolInfoDiagnosticReadinessResult>
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly lokiJSService: LokiJSService,
        private readonly dayjsService: DayjsService,
    ) {}

    @Interval(envConfig().executor.diagnose.dynamicLiquidityPoolInfo.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        // Overwrite the previous snapshot.
        this.results.clear()
        this.results.insert(results)
    }

    onApplicationBootstrap() {
        // Run once immediately on startup so callers don't wait for the first tick.
        this.diagnoseInterval()
    }

    async onModuleInit() {
        // Snapshot the pool set we want to diagnose into a local Loki collection.
        this.liquidityPoolCollection =
            await this.lokiJSService.createCollection<LiquidityPoolSchema>({
                name: "dynamic-liquidity-pool-info-diagnostic-pools",
                options: {
                    indices: ["displayId",
                        "id"],
                },
            })
        const liquidityPools = this.primaryMemoryStorageService
            .liquidityPoolCollection.chain()
            .find(
                {
                    isActive: {
                        $eq: true,
                    },
                }
            ).data({
                removeMeta: true,
            })
        // Insert a clean copy (strip Loki metadata from the source collection).
        this.liquidityPoolCollection.insert(liquidityPools)
        // Create the results collection used by `isReady()`.
        this.results = await this.lokiJSService.createCollection<DynamicLiquidityPoolInfoDiagnosticReadinessResult>({
            name: "dynamic-liquidity-pool-info-diagnostic-results",
            options: {
                indices: ["id"],
            },
        })
    }
    
    /**
     * Diagnose dynamic liquidity pool info for all active pools.
     *
     * @returns Array of dynamic liquidity pool info diagnostic readiness results
     */
    async diagnose(): Promise<Array<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> {
        const liquidityPools = this.liquidityPoolCollection.find()
      
        const promises: Array<Promise<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> = liquidityPools.map(async (liquidityPool) => {
            try {
                const cacheKey =
              liquidityPool.type === LiquidityPoolType.Clmm
                  ? CacheKey.DynamicClmmLiquidityPoolInfo
                  : CacheKey.DynamicDlmmLiquidityPoolInfo
      
                const dynamicInfo = await this.cacheService.get({
                    key: cacheKey,
                    args: [liquidityPool.id.toString()],
                })
      
                if (!dynamicInfo) {
                    this.winstonService.log(
                        WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound,
                        {
                            liquidityPoolId: liquidityPool.displayId 
                        },
                    )
      
                    return {
                        id: liquidityPool.displayId,
                    }
                }
      
                const snapshotAt = this.dayjsService.from(dynamicInfo.snapshotAt)
                const ageMs = this.dayjsService.now().diff(snapshotAt,
                    "ms")
      
                if (ageMs > liquidityPool.staleMs) {
                    this.winstonService.log(
                        WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
                        {
                            liquidityPoolId: liquidityPool.displayId,
                            ageMs,
                        },
                    )
                }
      
                return {
                    id: liquidityPool.displayId,
                    snapshotAt,
                }
            } catch (error) {
                this.winstonService.log(
                    WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed,
                    {
                        liquidityPoolId: liquidityPool.displayId,
                        error: error.message,
                    },
                )
      
                return {
                    id: liquidityPool.id,
                    snapshotAt: undefined,
                }
            }
        })
      
        return this.asyncService.allMustDone(promises)
    }

    /**
     * Check if a pool's dynamic info is ready (non-stale, available).
     *
     * @param id - Liquidity pool display ID
     * @returns true if ready
     */
    async ready(id: string): Promise<boolean> {
        const result = this.results.findOne({
            id: {
                $eq: id 
            } 
        })
        if (!result || !result.snapshotAt) return false
      
        const liquidityPool = this.liquidityPoolCollection.findOne({
            id: {
                $eq: id 
            },
        })
        if (!liquidityPool) return false
      
        const ageMs = this.dayjsService.now().diff(
            this.dayjsService.from(result.snapshotAt),
            "ms"
        )
        return ageMs <= liquidityPool.staleMs
    }
}

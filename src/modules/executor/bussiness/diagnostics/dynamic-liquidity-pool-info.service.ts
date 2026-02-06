import {
    Injectable,
    OnModuleInit,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    LiquidityPoolType,
    PrimaryMemoryStorageService,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    AsyncService,
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
                    indices: ["displayId", "id"],
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

    async diagnose(): Promise<Array<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> {
        // Evaluate each pool independently and return a full results list.
        const liquidityPools = this.liquidityPoolCollection.find()
        const promises: Array<Promise<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> = liquidityPools.map(
            async (liquidityPool) => {
                try {
                    // Cache key depends on pool type.
                    const cacheKey =
                        liquidityPool.type === LiquidityPoolType.Clmm
                            ? CacheKey.DynamicClmmLiquidityPoolInfo
                            : CacheKey.DynamicDlmmLiquidityPoolInfo

                    const dynamicInfo = await this.cacheService.get({
                        key: cacheKey,
                        args: [liquidityPool.id.toString()],
                    })

                    if (!dynamicInfo) {
                        // Cache miss: snapshot not available yet.
                        this.winstonService.log(
                            WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound,
                            {
                                liquidityPoolId: liquidityPool.displayId,
                            },
                        )

                        return {
                            id: liquidityPool.displayId,
                            ready: false,
                        }
                    }

                    // Staleness is based on the snapshot timestamp vs now.
                    const ageMs = Date.now() - dynamicInfo.snapshotAt.toDate().getTime()

                    if (ageMs > liquidityPool.staleMs) {
                        this.winstonService.log(
                            WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
                            {
                                liquidityPoolId: liquidityPool.displayId,
                                ageMs,
                            },
                        )
                        return {
                            id: liquidityPool.id,
                            ready: false,
                            ageMs,
                        }
                    }
                    return {
                        id: liquidityPool.id,
                        ready: true,
                        ageMs,
                    }
                } catch (error) {
                    // Any unexpected error: log and mark as failed.
                    this.winstonService.log(
                        WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed,
                        {
                            liquidityPoolId: liquidityPool.displayId,
                            error: error.message,
                        },
                    )
                    return {
                        id: liquidityPool.id,
                        ready: false,
                    }
                }
            }
        )
        return await this.asyncService.allMustDone<Array<DynamicLiquidityPoolInfoDiagnosticReadinessResult>>(promises)
    }

    async ready(
        id: string
    ): Promise<boolean> {
        const result = this.results.findOne({
            id: {
                $eq: id,
            },
        })
        return result?.ready ?? false
    }
}

export interface DynamicLiquidityPoolInfoDiagnosticReadinessResult {
    id: string
    ready: boolean
    ageMs?: number
}

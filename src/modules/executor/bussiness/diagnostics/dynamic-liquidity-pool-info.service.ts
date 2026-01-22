import {
    Injectable 
} from "@nestjs/common"
import {
    LiquidityPoolId,
    LiquidityPoolType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    AsyncService, DayjsService, InjectSuperJson,
    RetryService,
} from "@modules/mixin"
import {
    DynamicLiquidityPoolInfoDiagnosticsFailedException 
} from "@exceptions"
import {
    CacheKey, CacheService 
} from "@modules/cache"
import SuperJSON from "superjson"

/**
 * DynamicLiquidityPoolInfoDiagnosticService
 *
 * Hard startup gate for dynamic liquidity pool snapshot availability.
 *
 * This diagnostic validates that each configured liquidity pool has a
 * corresponding dynamic info snapshot in cache and that the snapshot is
 * fresh enough (within the pool's `staleMs` threshold).
 *
 * Behavior:
 * - For CLMM pools, reads `CacheKey.DynamicClmmLiquidityPoolInfo`
 * - For DLMM pools, reads `CacheKey.DynamicDlmmLiquidityPoolInfo`
 * - Logs per-pool success / not-found / stale / error details
 *
 * Failure semantics:
 * - If any pool is missing a dynamic snapshot, is stale, or errors during
 *   evaluation, the service throws `DynamicLiquidityPoolInfoDiagnosticsFailedException`
 *   with the failing pool display ids.
 */
@Injectable()
export class DynamicLiquidityPoolInfoDiagnosticService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly retryService: RetryService,
    ) {}

    async diagnose(): Promise<void> {
        await this.retryService.retry({
            options: {
                retries: Infinity,
            },
            action: async () => {
                const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find()
                const promises: Array<Promise<DynamicLiquidityPoolInfoReadinessChecker>> = liquidityPools.map(
                    async (liquidityPool) => {
                        try {
                            if (liquidityPool.type === LiquidityPoolType.Clmm) {
                                const dynamicInfo = await this.cacheService.get({
                                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
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
                                        liquidityPoolId: liquidityPool.displayId,
                                        success: false,
                                    }
                                }

                                const ageMs = this.dayjsService
                                    .now()
                                    .diff(dynamicInfo.snapshotAt.toDate())

                                if (ageMs > liquidityPool.staleMs) {
                                    this.winstonService.log(
                                        WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
                                        {
                                            liquidityPoolId: liquidityPool.displayId,
                                            ageMs,
                                        },
                                    )
                                    return {
                                        liquidityPoolId: liquidityPool.displayId,
                                        success: false,
                                    }
                                }

                                this.winstonService.log(
                                    WinstonLog.DynamicLiquidityPoolInfoDiagnosticSuccess,
                                    {
                                        liquidityPoolId: liquidityPool.displayId,
                                    },
                                )
                                return {
                                    liquidityPoolId: liquidityPool.displayId,
                                    success: true,
                                }
                            }

                            // DLMM
                            const dynamicInfo = await this.cacheService.get({
                                key: CacheKey.DynamicDlmmLiquidityPoolInfo,
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
                                    liquidityPoolId: liquidityPool.displayId,
                                    success: false,
                                }
                            }

                            const ageMs = this.dayjsService
                                .now()
                                .diff(dynamicInfo.snapshotAt.toDate())

                            if (ageMs > liquidityPool.staleMs) {
                                this.winstonService.log(
                                    WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
                                    {
                                        liquidityPoolId: liquidityPool.displayId,
                                        ageMs,
                                    },
                                )
                                return {
                                    liquidityPoolId: liquidityPool.displayId,
                                    success: false,
                                }
                            }

                            this.winstonService.log(
                                WinstonLog.DynamicLiquidityPoolInfoDiagnosticSuccess,
                                {
                                    liquidityPoolId: liquidityPool.displayId,
                                },
                            )
                            return {
                                liquidityPoolId: liquidityPool.displayId,
                                success: true,
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
                                liquidityPoolId: liquidityPool.displayId,
                                success: false,
                            }
                        }
                    })

                const results = await this.asyncService.allMustDone(promises)

                const failedResults = results.filter((result) => !result.success)
            
                if (failedResults.length > 0) {
                    throw new DynamicLiquidityPoolInfoDiagnosticsFailedException({
                        liquidityPoolIds: failedResults.map((result) => result.liquidityPoolId),
                    })
                }
            }
        })
    }
}

export interface DynamicLiquidityPoolInfoReadinessChecker {
    liquidityPoolId: LiquidityPoolId
    success: boolean
}

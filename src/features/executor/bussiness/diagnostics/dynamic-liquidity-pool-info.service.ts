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
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    AsyncService,
    DayjsService,
    LokiJSService,
} from "@modules/mixin"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    Interval,
} from "@nestjs/schedule"
import {
    envConfig,
} from "@modules/env"
import {
    Collection,
} from "lokijs"
import type {
    DynamicLiquidityPoolInfoDiagnosticReadinessResult,
} from "../types"

@Injectable()
export class DynamicLiquidityPoolInfoDiagnosticService
implements OnModuleInit, OnApplicationBootstrap
{
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    private results: Collection<DynamicLiquidityPoolInfoDiagnosticReadinessResult>

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly lokiJSService: LokiJSService,
        private readonly dayjsService: DayjsService,
    ) {}

    /* ================= BOOTSTRAP ================= */

    onApplicationBootstrap() {
        this.diagnoseInterval()
    }

    @Interval(envConfig().executor.diagnose.dynamicLiquidityPoolInfo.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        this.results.clear()
        this.results.insert(results)
    }

    async onModuleInit() {
        this.liquidityPoolCollection =
            await this.lokiJSService.createCollection<LiquidityPoolSchema>({
                name: "dynamic-liquidity-pool-info-diagnostic-pools",
                options: {
                    indices: ["displayId",
                        "id"],
                },
            })

        const liquidityPools =
            this.primaryMemoryStorageService.liquidityPoolCollection
                .chain()
                .find({
                    isActive: {
                        $eq: true 
                    },
                })
                .data({
                    removeMeta: true,
                })

        this.liquidityPoolCollection.insert(liquidityPools)

        this.results =
            await this.lokiJSService.createCollection<DynamicLiquidityPoolInfoDiagnosticReadinessResult>({
                name: "dynamic-liquidity-pool-info-diagnostic-results",
                options: {
                    indices: ["id"],
                },
            })
    }

    /* ================= CORE ================= */

    private isReady(
        result?: DynamicLiquidityPoolInfoDiagnosticReadinessResult,
        staleMs?: number,
    ): boolean {
        if (!result?.snapshotAt) return false
        if (!staleMs) return false

        const ageMs = this.dayjsService
            .now()
            .diff(result.snapshotAt,
                "ms")

        const isReady = ageMs <= staleMs
        return isReady
    }

    async diagnose(): Promise<Array<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> {
        const liquidityPools = this.liquidityPoolCollection.find()

        const promises: Array<
            Promise<DynamicLiquidityPoolInfoDiagnosticReadinessResult>
        > = liquidityPools.map(async (liquidityPool) => {
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
                            liquidityPoolId: liquidityPool.displayId,
                        },
                    )

                    return {
                        id: liquidityPool.id,
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
                    id: liquidityPool.id,
                    snapshotAt: this.dayjsService.now(),
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
                }
            }
        })

        return this.asyncService.allMustDone(promises)
    }

    /* ================= PUBLIC ================= */

    async ready(id: string): Promise<boolean> {
        const result = this.results.findOne({
            id: {
                $eq: id 
            },
        })
        if (!result) return false

        const liquidityPool = this.liquidityPoolCollection.findOne({
            id: {
                $eq: id 
            },
        })
        if (!liquidityPool) return false

        return this.isReady(result,
            liquidityPool.staleMs)
    }
}
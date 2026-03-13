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
import type {
    DynamicLiquidityPoolInfoDiagnosticReadinessResult,
} from "./types"

@Injectable()
export class DynamicLiquidityPoolInfoDiagnosticService
implements OnModuleInit, OnApplicationBootstrap
{
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    private results: Map<string, DynamicLiquidityPoolInfoDiagnosticReadinessResult> = new Map()

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    /* ================= BOOTSTRAP ================= */

    /**
     * On application bootstrap.
     */
    onApplicationBootstrap() {
        this.diagnoseInterval()
    }

    /**
     * Diagnose interval.
     */
    @Interval(envConfig().executor.diagnose.dynamicLiquidityPoolInfo.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        this.results = new Map(results.map((result) => [result.id,
            result]))
    }

    /**
     * On module init.
     */
    async onModuleInit() {
        const liquidityPools = Array.from(this.primaryMemoryStorageService.liquidityPoolMap.values()).filter(
            (p) => p.isActive === true,
        )
        this.liquidityPoolMap = new Map(liquidityPools.map((liquidityPool) => [liquidityPool.id,
            liquidityPool]))
        this.results = new Map(liquidityPools.map((liquidityPool) => [liquidityPool.id,
            {
                id: liquidityPool.id,
            }]))
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

    /**
     * Diagnose.
     *
     * @returns Array of dynamic liquidity pool info diagnostic readiness results
     */
    async diagnose(): Promise<Array<DynamicLiquidityPoolInfoDiagnosticReadinessResult>> {
        const liquidityPools = Array.from(this.liquidityPoolMap.values())

        const promises: Array<
            Promise<DynamicLiquidityPoolInfoDiagnosticReadinessResult>
        > = liquidityPools.map(async (liquidityPool) => {
            try {
                const cacheKey =
                    liquidityPool.type === LiquidityPoolType.Clmm
                        ? CacheKey.DynamicClmmLiquidityPoolInfo
                        : CacheKey.DynamicDlmmLiquidityPoolInfo

                const dynamicInfo = await this.cacheService.get(
                    {
                        key: cacheKey,
                        args: [liquidityPool.id.toString()],
                    }
                )

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

    /**
     * Ready.
     *
     * @param id - Liquidity pool id
     * @returns True if the liquidity pool is ready, false otherwise
     */
    async ready(id: string): Promise<boolean> {
        const result = this.results.get(id)
        if (!result) return false

        const liquidityPool = this.liquidityPoolMap.get(id)
        if (!liquidityPool) return false

        return this.isReady(result,
            liquidityPool.staleMs)
    }
}
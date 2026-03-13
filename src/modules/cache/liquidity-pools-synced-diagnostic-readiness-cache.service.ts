import {
    Injectable
} from "@nestjs/common"
import {
    DayjsService
} from "@modules/mixin"
import {
    CacheKey
} from "./enums"
import {
    LiquidityPoolsSyncedDiagnosticReadinessCacheResult,
    SetLiquidityPoolsSyncedDiagnosticReadinessParams
} from "./types"
import {
    CacheService
} from "./cache.service"

/**
 * Service for reading and writing liquidity pools synced diagnostic readiness cache.
 *
 * @example
 * await liquidityPoolsSyncedDiagnosticReadinessCacheService.set({ id })
 * const result = await liquidityPoolsSyncedDiagnosticReadinessCacheService.get()
 */
@Injectable()
export class LiquidityPoolsSyncedDiagnosticReadinessCacheService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Sets or updates liquidity pools synced diagnostic readiness for an id.
     *
     * @param param - Id to mark as ready
     *
     * @example
     * await service.set({ id: "pool-1" })
     */
    async set({
        id,
    }: SetLiquidityPoolsSyncedDiagnosticReadinessParams): Promise<void> {
        let cacheResult = await this.cacheService.get({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
        })

        if (!cacheResult) {
            cacheResult = {
                results: {
                },
                snapshotAt: this.dayjsService.now(),
            }
        }

        cacheResult.results[id] = {
            snapshotAt: this.dayjsService.now(),
        }

        await this.cacheService.set({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
            cacheResult,
        })
    }

    /**
     * Gets liquidity pools synced diagnostic readiness cache result.
     *
     * @returns Cached result or default empty result
     *
     * @example
     * const result = await service.get()
     */
    async get(): Promise<LiquidityPoolsSyncedDiagnosticReadinessCacheResult> {
        const cachedResult = await this.cacheService.get({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
        })

        if (!cachedResult) {
            return {
                results: {
                },
                snapshotAt: this.dayjsService.now(),
            }
        }

        return cachedResult
    }
    
    /**
     * Sets or updates liquidity pools synced diagnostic readiness for many ids.
     *
     * @param ids - Array of liquidity pool ids
     *
     * @example
     * await service.setMany([ "pool-1", "pool-2" ])
     */
    async setMany(
        ids: Array<string>
    ): Promise<void> {
        let cacheResult = await this.cacheService.get({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
        })
        const snapshotAt = this.dayjsService.now()
        if (!cacheResult) {
            cacheResult = {
                results: {
                },
                snapshotAt,
            }
        }
        for (const id of ids) {
            cacheResult.results[id] = {
                snapshotAt,
            }
        }
        await this.cacheService.set({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
            cacheResult,
        })
    }
}

import {
    Injectable 
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    LiquidityPoolsSyncedDiagnosticReadinessResult
} from "./config"
import {
    CacheService 
} from "./cache.service"
import {
    CacheKey 
} from "./config"

@Injectable()
export class LiquidityPoolsSyncedDiagnosticReadinessCacheService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
    ) {}

    async set(
        {
            id,
        }
        : SetLiquidityPoolsSyncedDiagnosticReadinessParams
    ): Promise<void> {
        // try to get the cache result
        let cacheResult = await this.cacheService.get(
            {
                key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
            }
        )
        if (!cacheResult) {
            cacheResult = {
                results: {
                },
                snapshotAt: this.dayjsService.now(),
            }
        }
        // update the cache result
        cacheResult.results[id] = {
            snapshotAt: this.dayjsService.now(),
        }
        // save the cache result
        await this.cacheService.set({
            key: CacheKey.LiquidityPoolsSyncedDiagnosticReadiness,
            cacheResult,
        })
    }

    async get(): Promise<LiquidityPoolsSyncedDiagnosticReadinessResult> {
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
}

export interface SetLiquidityPoolsSyncedDiagnosticReadinessParams {
    id: string
}
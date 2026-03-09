import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import type { CexTokenPriceCacheResult } from "@modules/cache"
import {
    CexId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DayjsService,
} from "@modules/mixin"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./cex-health-monitor.module-definition"

const STALE_THRESHOLD_SECONDS_DEFAULT = 10
const CHECK_INTERVAL_MS = 2000

/**
 * Checks CEX price health per token: picks first CEX in trackedCexIds
 * with a price update within staleThresholdSeconds (default 10s).
 * Writes active CEX per token to cache (activePriceCex: tokenId -> cexId).
 */
@Injectable()
export class PriceCheckService implements OnApplicationBootstrap {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}

    onApplicationBootstrap(): void {
        this.run()
        setInterval(() => this.run(), CHECK_INTERVAL_MS)
    }

    /**
     * For each token with a tracked CEX listing, finds first CEX with update &lt;= threshold
     * and writes activePriceCex[tokenId] = cexId.
     */
    async run(): Promise<void> {
        const { trackedCexIds, staleThresholdSeconds = STALE_THRESHOLD_SECONDS_DEFAULT } =
            this.options
        if (!trackedCexIds?.length) return

        const tokenIds = this.getTokenIdsWithTrackedCex(trackedCexIds)
        const now = this.dayjsService.now()

        for (const tokenId of tokenIds) {
            let activeCex: CexId = trackedCexIds[0]
            for (const cexId of trackedCexIds) {
                const result = await this.cacheService.get({
                    key: CacheKey.CexTokenPriceUpdated,
                    args: [tokenId, cexId],
                }) as CexTokenPriceCacheResult | undefined
                const snapshotAt = result?.snapshotAt
                    ? this.dayjsService.from(result.snapshotAt)
                    : null
                if (snapshotAt) {
                    const ageSeconds = now.diff(snapshotAt, "second")
                    if (ageSeconds <= staleThresholdSeconds) {
                        activeCex = cexId
                        break
                    }
                }
            }
            await this.cacheService.set({
                key: CacheKey.ActivePriceCex,
                args: [tokenId],
                cacheResult: { cexId: activeCex },
            })
        }
    }

    private getTokenIdsWithTrackedCex(trackedCexIds: Array<CexId>): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: { $in: trackedCexIds },
                },
            },
        })
        return tokens.map((t) => t.id)
    }
}

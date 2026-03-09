import {
    Injectable,
} from "@nestjs/common"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DayjsService,
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    AsyncService,
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"

/**
 * Checks CEX price health per token: picks first CEX in trackedCexIds
 * with a price update within staleThresholdSeconds (default 10s).
 * Writes active CEX per token to cache (activePriceCex: tokenId -> cexId).
 */
@Injectable()
export class VolumeCheckService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Checks CEX price health per token: picks first CEX in trackedCexIds
     * with a price update within staleThresholdSeconds (default 10s).
     * Writes active CEX per token to cache (activePriceCex: tokenId -> cexId).
     */
    @Interval(envConfig().cexHealthMonitor.volume.checkIntervalMs)
    async checkVolume(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const now = this.dayjsService.now()
        const promises = tokens.map(
            async (token) => {
                const trackedCexIds = token.trackedCexIds
                if (!trackedCexIds?.length) return
                let activeCex = trackedCexIds[0]
                for (const cexId of trackedCexIds) {
                    const result = await this.cacheService.get({
                        key: CacheKey.CexTokenVolumeUpdated,
                        args: [
                            token.id,
                            cexId
                        ],
                    })
                    const snapshotAt = result?.snapshotAt
                        ? this.dayjsService.from(result.snapshotAt)
                        : null
                    if (snapshotAt) {
                        const ageSeconds = now.diff(snapshotAt,
                            "second")
                        if (ageSeconds <= envConfig().cexHealthMonitor.volume.staleThresholdSeconds) {
                            activeCex = cexId
                            break
                        }
                    }
                }
                await this.cacheService.set(
                    {
                        key: CacheKey.ActiveVolumeCex,
                        args: [token.id],
                        cacheResult: {
                            cexId: activeCex 
                        },
                    }
                )
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }
}

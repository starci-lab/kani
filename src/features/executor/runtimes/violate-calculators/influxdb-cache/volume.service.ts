import {
    PrimaryInfluxdbVolumeBucketService,
    PrimaryMemoryStorageService,
    TokenSchema,
} from "@modules/databases"
import {
    envConfig,
} from "@modules/env"
import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import type {
    GetPointsParams,
    GetVolumePointsResult,
    InfluxdbVolumeCache,
} from "../types"
import {
    AsyncService,
    DayjsService,
} from "@modules/mixin"
import {
    Interval,
} from "@nestjs/schedule"

/**
 * Service for caching volume points in InfluxDB.
 */
@Injectable()
export class InfluxdbVolumeCacheService implements OnApplicationBootstrap {
    private storage = new Map<string, InfluxdbVolumeCache>()

    constructor(
        private readonly primaryInfluxdbVolumeBucketService: PrimaryInfluxdbVolumeBucketService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Get the key for the storage.
     * @param tokenId - The token id.
     * @param cexId - The cex id.
     * @returns The key.
     */
    private getKey(tokenId: string, cexId: string): string {
        return `${tokenId}-${cexId}`
    }

    /**
     * Bootstrap the volume cache service.
     */
    async onApplicationBootstrap(): Promise<void> {
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values())
        const promises = tokens.map(async (token) => {
            await this.storePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store volume points for a token in InfluxDB.
     * @param token - The token to store volume points for.
     */
    async storePoints(token: TokenSchema): Promise<void> {
        const promises = token.trackedCexIds.map(
            async (cexId) => {
                const volumePoints = await this.primaryInfluxdbVolumeBucketService.queryPromise({
                    id: token.id,
                    intervalMs: envConfig().executor.runtime.influxdbCache.volume.intervalMs,
                    cexId,
                })
                this.storage.delete(
                    this.getKey(token.id,
                        cexId),
                )
                this.storage.set(
                    this.getKey(token.id,
                        cexId),
                    {
                        tokenId: token.id,
                        cexId,
                        points: volumePoints,
                    },
                )
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store all volume points for all tokens in InfluxDB on an interval.
     */
    @Interval(envConfig().executor.runtime.influxdbCache.volume.storeIntervalMs)
    async storeAllPoints(): Promise<void> {
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values())
        const promises = tokens.map(async (token) => {
            await this.storePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Get volume points for a token and CEX within the given time interval.
     *
     * @param params - tokenId, cexId, and timeInterval (startMs, endMs)
     * @returns Volume points in the time window, or empty array if none
     *
     * @example
     * const points = await service.getPoints({ tokenId: "x", cexId: "binance", timeInterval: { startMs: 0, endMs: Date.now() } })
     */
    async getPoints(
        { 
            tokenId, 
            cexId, 
            timeIntervalMs,
            snapshotMs,
        }: GetPointsParams
    ): Promise<GetVolumePointsResult> {
        // get the entries from the storage
        const entries = Array.from(this.storage.values())
            .filter((entry) => entry.tokenId === tokenId && entry.cexId === cexId)
        // get the now
        const now = snapshotMs ? this.dayjsService.from(snapshotMs) : this.dayjsService.now()
        // get the points from the entries and filter by the time interval
        return entries.flatMap(
            (entry) => entry.points)
            .filter((point) => now.diff(
                this.dayjsService.from(point.time),
                "millisecond"
            ) <= timeIntervalMs
            )
    }
}

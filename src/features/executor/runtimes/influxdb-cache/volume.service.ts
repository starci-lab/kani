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
    OnModuleInit,
} from "@nestjs/common"
import type {
    GetPointsParams,
    GetVolumePointsResult,
    InfluxdbVolumeCache,
} from "../types"
import {
    Collection,
} from "lokijs"
import {
    LokiJSService,
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
export class InfluxdbVolumeCacheService implements OnModuleInit, OnApplicationBootstrap {
    private storage: Collection<InfluxdbVolumeCache>

    constructor(
        private readonly primaryInfluxdbVolumeBucketService: PrimaryInfluxdbVolumeBucketService,
        private readonly lokiJSService: LokiJSService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Initialize the volume cache storage.
     */
    async onModuleInit(): Promise<void> {
        this.storage = await this.lokiJSService.createCollection<InfluxdbVolumeCache>({
            name: "influxdb-volume-cache",
            options: {
                indices: [
                    "tokenId",
                    "cexId",
                ],
            },
        })
    }

    /**
     * Bootstrap the volume cache service.
     */
    async onApplicationBootstrap(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
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
                this.storage.findAndRemove({
                    tokenId: token.id,
                    cexId,
                })
                this.storage.insert({
                    tokenId: token.id,
                    cexId,
                    points: volumePoints,
                })
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store all volume points for all tokens in InfluxDB on an interval.
     */
    @Interval(envConfig().executor.runtime.influxdbCache.volume.storeIntervalMs)
    async storeAllPoints(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
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
            timeIntervalMs 
        }: GetPointsParams
    ): Promise<GetVolumePointsResult> {
        const entries = this.storage.find({
            tokenId,
            cexId,
        })
        if (!entries || entries.length === 0) {
            return []
        }
        // get the points from the entries
        const points = entries.flatMap((entry) => entry.points)
        // filter the points by the time interval
        return points.filter(
            (point) => this.dayjsService.now().diff(
                this.dayjsService.from(point.time),
                "millisecond"
            ) <= timeIntervalMs
        )
    }
}

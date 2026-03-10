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
    InfluxdbVolumeCache,
} from "../types"
import {
    Collection,
} from "lokijs"
import {
    LokiJSService,
    AsyncService,
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
            await this.storeVolumePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store volume points for a token in InfluxDB.
     * @param token - The token to store volume points for.
     */
    async storeVolumePoints(token: TokenSchema): Promise<void> {
        const promises = token.trackedCexIds.map(async (cexId) => {
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
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store all volume points for all tokens in InfluxDB on an interval.
     */
    @Interval(envConfig().executor.runtime.influxdbCache.volume.storeIntervalMs)
    async storeAllVolumePoints(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const promises = tokens.map(async (token) => {
            await this.storeVolumePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }
}

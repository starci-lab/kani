import {
    PrimaryInfluxdbPriceBucketService, 
    PrimaryMemoryStorageService, 
    TokenSchema
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit
} from "@nestjs/common"
import type {
    GetPointsParams,
    GetPricePointsResult,
    InfluxdbPriceCache,
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
    Interval 
} from "@nestjs/schedule"

/**
 * Service for caching price points in InfluxDB.
 */
@Injectable()
export class InfluxdbPriceCacheService implements OnModuleInit, OnApplicationBootstrap {
    private storage: Collection<InfluxdbPriceCache>
    constructor(
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        private readonly lokiJSService: LokiJSService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Initialize the price cache storage.
     */
    async onModuleInit(): Promise<void> {
        this.storage = await this.lokiJSService.createCollection<InfluxdbPriceCache>({
            name: "influxdb-price-cache",
            options: {
                indices: [
                    "tokenId",
                    "cexId"
                ],
            },
        })
    }

    /**
     * Bootstrap the price cache service.
     */
    async onApplicationBootstrap(): Promise<void> {
        // loop all tokens and store price points
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const promises = tokens.map(async (token) => {
            await this.storePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store price points for a token in InfluxDB.
     * @param token - The token to store price points for.
     */
    async storePoints(token: TokenSchema): Promise<void> {
        const promises = token.trackedCexIds.map(async (cexId) => {
            const pricePoints = await this.primaryInfluxdbPriceBucketService.queryPromise(
                {
                    id: token.id,
                    intervalMs: envConfig().executor.runtime.influxdbCache.price.intervalMs,
                    cexId,
                }
            )
            // clear existing price points for this token and cex
            this.storage.findAndRemove(
                {
                    tokenId: token.id,
                    cexId,
                }
            )
            // insert new price points
            this.storage.insert(
                {
                    tokenId: token.id,
                    cexId,
                    points: pricePoints,
                }
            )
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store all price points for all tokens in InfluxDB on an interval.
     */
    @Interval(envConfig().executor.runtime.influxdbCache.price.storeIntervalMs)
    async storeAllPoints(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const promises = tokens.map( 
            async (token) => {
                await this.storePoints(token)
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Get price points for a token and CEX within the given time interval.
     *
     * @param params - tokenId, cexId, and timeInterval (startMs, endMs)
     * @returns Price points in the time window, or empty array if none
     *
     * @example
     * const points = await service.getPoints({ tokenId: "x", cexId: "binance", timeIntervalMs: 1000 })
     */
    async getPoints(
        { 
            tokenId, 
            cexId, 
            timeIntervalMs 
        }: GetPointsParams
    ): Promise<GetPricePointsResult> {
        // get the entries from the storage
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
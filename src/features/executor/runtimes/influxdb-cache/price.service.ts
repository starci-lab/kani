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
    InfluxdbPriceCache,
} from "../types"
import {
    Collection,
} from "lokijs"
import {
    LokiJSService,
    AsyncService,
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
            await this.storePricePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store price points for a token in InfluxDB.
     * @param token - The token to store price points for.
     */
    async storePricePoints(token: TokenSchema): Promise<void> {
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
    async storeAllPricePoints(): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const promises = tokens.map( 
            async (token) => {
                await this.storePricePoints(token)
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }
}
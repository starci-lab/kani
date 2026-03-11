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
import fs from "fs"
import { PriceService } from "@modules/blockchains"
import { TokenNotFoundException } from "@modules/exceptions"

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
        private readonly priceService: PriceService,
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
            timeIntervalMs,
            snapshotMs,
        }: GetPointsParams
    ): Promise<GetPricePointsResult> {
        // get the entries from the storage
        const entries = this.storage.find({
            tokenId,
            cexId,
        })
        const now = snapshotMs ? this.dayjsService.from(snapshotMs) : this.dayjsService.now()
        // get the points from the entries
        const points = entries?.flatMap((entry) => entry.points) || []
        // filter the points by the time interval
        const influxdbPricePoints = points.filter(
            (point) => now.diff(
                this.dayjsService.from(point.time),
                "millisecond"
            ) <= timeIntervalMs
        )
        // if points is empty, we return the price stored in the cache
        if (points.length === 0) {
            const token = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: tokenId,
            })
            if (!token) {
                throw new TokenNotFoundException({
                    id: tokenId,
                })
            }
            const price = await this.priceService.resolvePrice({
                token,
            })
            return [
                {
                    id: token.id,
                    cex_id: cexId,
                    price: price.price.toNumber(),
                    time: now.subtract(timeIntervalMs, "millisecond").toDate().getTime(),
                },
                {
                    id: token.id,
                    cex_id: cexId,
                    price: price.price.toNumber(),
                    time: now.toDate().getTime(),
                },
            ]
        }
        // if no point found, we take the last point of the influxdb price points
        if (influxdbPricePoints.length === 0) {
            return [
                {
                    id: points[points.length - 1].id,
                    cex_id: points[points.length - 1].cex_id,
                    price: points[points.length - 1].price,
                    time: now.subtract(timeIntervalMs, "millisecond").toDate().getTime(),
                },
                {
                    id: points[points.length - 1].id,
                    cex_id: points[points.length - 1].cex_id,
                    price: points[points.length - 1].price,
                     time: now.toDate().getTime(),
                },
            ]
        }
        // if length is 1, simply return 2 points, one is the first point, the other is the last point
        if (influxdbPricePoints.length === 1) {
            return [
                {
                    id: influxdbPricePoints[0].id,
                    cex_id: influxdbPricePoints[0].cex_id,
                    price: influxdbPricePoints[0].price,
                    time: now.subtract(timeIntervalMs, "millisecond").toDate().getTime(),
                },
                {
                    id: influxdbPricePoints[0].id,
                    cex_id: influxdbPricePoints[0].cex_id,
                    price: influxdbPricePoints[0].price,
                    time: now.toDate().getTime(),
                },
            ]
        }
        // if length is greater than 1, we move the first point to the end of the array and so do the last point
        const firstPoint = influxdbPricePoints[0]
        const lastPoint = influxdbPricePoints[influxdbPricePoints.length - 1]
        return [
            {
                id: firstPoint.id,
                cex_id: firstPoint.cex_id,
                price: firstPoint.price,
                time: now.subtract(timeIntervalMs, "millisecond").toDate().getTime(),
            },
            ...influxdbPricePoints.slice(1, -1),
            {
                id: lastPoint.id,
                cex_id: lastPoint.cex_id,
                price: lastPoint.price,
                time: now.toDate().getTime(),
            }
        ]
    }
}
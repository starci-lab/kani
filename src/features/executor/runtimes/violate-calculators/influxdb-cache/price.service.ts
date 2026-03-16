import {
    PrimaryInfluxdbPriceBucketService, 
    PrimaryMemoryStorageService, 
    TokenSchema
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    Injectable, OnApplicationBootstrap
} from "@nestjs/common"
import type {
    GetPointsParams,
    GetPricePointsResult,
    InfluxdbPriceCache,
} from "../types"
import {
    AsyncService,
    DayjsService,
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    PriceService 
} from "@modules/blockchains"
import {
    TokenNotFoundException 
} from "@modules/exceptions"

/**
 * Service for caching price points in InfluxDB.
 */
@Injectable()
export class InfluxdbPriceCacheService implements OnApplicationBootstrap {
    private storage = new Map<string, InfluxdbPriceCache>()
    constructor(
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
        private readonly priceService: PriceService,
    ) {}
    /**
     * Bootstrap the price cache service.
     */
    async onApplicationBootstrap(): Promise<void> {
        // loop all tokens and store price points
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values())
        const promises = tokens.map(async (token) => {
            await this.storePoints(token)
        })
        await this.asyncService.allIgnoreError(promises)
    }

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
     * Store price points for a token in InfluxDB.
     * @param token - The token to store price points for.
     */
    async storePoints(token: TokenSchema): Promise<void> {
        const promises = token.trackedCexIds.map(
            async (cexId) => {
                const pricePoints = await this.primaryInfluxdbPriceBucketService.queryPromise(
                    {
                        id: token.id,
                        intervalMs: envConfig().executor.runtime.influxdbCache.price.intervalMs,
                        cexId,
                    }
                )
                // insert new price points
                this.storage.set(
                    this.getKey(
                        token.id,
                        cexId
                    ),
                    {
                        tokenId: token.id,
                        cexId,
                        points: pricePoints,
                    },
                )
            })
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Store all price points for all tokens in InfluxDB on an interval.
     */
    @Interval(envConfig().executor.runtime.influxdbCache.price.storeIntervalMs)
    async storeAllPoints(): Promise<void> {
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values())
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
        const now = snapshotMs ? this.dayjsService.from(snapshotMs) : this.dayjsService.now()
        const startMs = now.subtract(timeIntervalMs,
            "millisecond").toDate().getTime()
        const endMs = now.toDate().getTime()

        const entry = this.storage.get(this.getKey(tokenId,
            cexId))
        const points = entry?.points ?? []
        const influxdbPricePoints = points.filter(
            (point) => point.time >= startMs && point.time <= endMs,
        )

        if (points.length === 0) {
            const token = this.primaryMemoryStorageService.tokenMap.get(tokenId)
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
                    time: startMs,
                },
                {
                    id: token.id,
                    cex_id: cexId,
                    price: price.price.toNumber(),
                    time: endMs,
                },
            ]
        }
        if (influxdbPricePoints.length === 0) {
            const last = points[points.length - 1]
            return [
                {
                    id: last.id,
                    cex_id: last.cex_id,
                    price: last.price,
                    time: startMs,
                },
                {
                    id: last.id,
                    cex_id: last.cex_id,
                    price: last.price,
                    time: endMs,
                },
            ]
        }
        if (influxdbPricePoints.length === 1) {
            const point = influxdbPricePoints[0]
            return [
                {
                    id: point.id,
                    cex_id: point.cex_id,
                    price: point.price,
                    time: startMs,
                },
                {
                    id: point.id,
                    cex_id: point.cex_id,
                    price: point.price,
                    time: endMs,
                },
            ]
        }
        const firstPoint = influxdbPricePoints[0]
        const lastPoint = influxdbPricePoints[influxdbPricePoints.length - 1]
        return [
            {
                id: firstPoint.id,
                cex_id: firstPoint.cex_id,
                price: firstPoint.price,
                time: startMs,
            },
            ...influxdbPricePoints.slice(
                1,
                -1,
            ),
            {
                id: lastPoint.id,
                cex_id: lastPoint.cex_id,
                price: lastPoint.price,
                time: endMs,
            },
        ]
    }
}
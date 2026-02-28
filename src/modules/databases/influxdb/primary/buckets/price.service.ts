// influx.service.ts
import {
    Injectable
} from "@nestjs/common"
import type {
    InfluxDBClient, 
} from "@influxdata/influxdb3-client"
import {
    Point 
} from "@influxdata/influxdb3-client"
import {
    InjectPrimaryInfluxdb 
} from "../influxdb.decorators"
import {
    PricePoint,
    QueryInfluxdbPriceBucketAsyncIteratorParams,
    QueryInfluxdbPriceBucketPromiseParams,
    WriteInfluxdbPriceBucketParams,
    WritePriceWindowResultParams,
    WriteMomentumStateParams,
} from "../types"
import {
    DayjsService 
} from "@modules/mixin"
import {
    InfluxDBNotInitializedException,
} from "@modules/exceptions"
import {
    envConfig,
} from "@modules/env"
import {
    PrimaryInfluxdbLifecycleService 
} from "../influxdb-lifecycle.service"
import {
    from, lastValueFrom, toArray 
} from "rxjs"

/**
 * Service for the primary InfluxDB price bucket.
 */
@Injectable()
export class PrimaryInfluxdbPriceBucketService {
    /**
     * Constructor for the PrimaryInfluxdbPriceBucketService.
     * @param influx - The InfluxDB instance.
     */
    constructor(
        @InjectPrimaryInfluxdb()
        private readonly influxdbClient: InfluxDBClient,
        private readonly dayjsService: DayjsService,
        private readonly influxdbLifecycleService: PrimaryInfluxdbLifecycleService,
    ) {
    }
    /**
     * Write a price to the primary InfluxDB price bucket.
     * @param params - The parameters for the price.
     */
    async write(
        {
            id,
            price,
            marketListingId,
        }: WriteInfluxdbPriceBucketParams
    ) 
    {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        // create the point
        const point = Point.measurement("price")
            .setTag("id",
                id)
            .setTag("market_listing_id",
                marketListingId)
            .setField("price",
                price.toNumber())
            .setTimestamp(
                this.dayjsService.now().toDate()
            )
        // convert the point to line protocol
        const line = point.toLineProtocol()
        // write the line protocol to the database
        await this.influxdbClient.write(
            line ?? "",
            envConfig().databases.influxdb.primary.database,
        )
    }

    /**
     * Get a price from the primary InfluxDB price bucket.
     * @param params - The parameters for the price.
     */
    queryAsyncIterator(
        {
            id,
            intervalMs,
            marketListingId,
        }: QueryInfluxdbPriceBucketAsyncIteratorParams
    ): AsyncIterableIterator<PricePoint> {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        const fromTime = this.dayjsService
            .now()
            .subtract(intervalMs,
                "millisecond")
            .toISOString()
    
        // Prefer: select only needed columns + order by time
        const sql = `
        SELECT id, market_listing_id, price, time
        FROM price
        WHERE id = $id
          AND market_listing_id = $marketListingId
          AND time >= $fromTime
        ORDER BY time DESC
      `
        // InfluxDB 3 client supports params in recent versions; if yours doesn't,
        // you'll need the fallback below.
        return this.influxdbClient.query(sql,
            envConfig().databases.influxdb.primary.database,
            {
                params: {
                    id,
                    marketListingId,
                    fromTime,
                },
            }
        ) as AsyncIterableIterator<PricePoint>
    }

    /**
     * Query a price from the primary InfluxDB price bucket.
     * @param params - The parameters for the price.
     */
    async queryPromise(
        {
            id,
            intervalMs,
            marketListingId,
        }: QueryInfluxdbPriceBucketPromiseParams
    ): Promise<Array<PricePoint>> {
        // query the price points
        const asyncIterator = this.queryAsyncIterator({
            id,
            intervalMs,
            marketListingId,
        })
        // convert the async iterator to an array
        return await lastValueFrom(from(asyncIterator).pipe(toArray()))
    }

    /**
     * Check if the price points have a large gap.
     * @param sorted - The sorted price points.
     * @param maxGapMs - The maximum gap in milliseconds.
     * @returns True if the price points have a large gap, false otherwise.
     */
    public hasLargeGap(
        sorted: Array<PricePoint>
    ): boolean {
        if (sorted.length < envConfig().inspector.priceWindow.minSamples) {
            return true
        }
        for (let i = 1; i < sorted.length; i++) {
            const prev = typeof sorted[i - 1].time === "number"
                ? sorted[i - 1].time
                : new Date(sorted[i - 1].time).getTime()
      
            const curr = typeof sorted[i].time === "number"
                ? sorted[i].time
                : new Date(sorted[i].time).getTime()
      
            if (curr - prev > envConfig().inspector.priceWindow.maxGapMs) {
                return true
            }
        }
        return false
    }

    /**
     * Writes momentum state to the primary InfluxDB price bucket.
     *
     * @param params - Parameters for writing momentum state
     *
     * @example
     * await service.writeMomentumState({
     *   id: "token123",
     *   intervalMs: 60000,
     *   marketListingId: MarketListingId.Pyth,
     *   momentumState: MomentumState.Up
     * })
     */
    async writeMomentumState({
        id,
        marketListingId,
        momentumState,
    }: WriteMomentumStateParams): Promise<void> {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }

        // create the point
        const point = Point.measurement("momentum_state")
            .setTag("id",
                id)
            .setTag("market_listing_id",
                marketListingId)
            .setField("momentum_state",
                momentumState)
            .setTimestamp(this.dayjsService.now().toDate())

        // convert the point to line protocol
        const line = point.toLineProtocol()

        // write the line protocol to the database
        await this.influxdbClient.write(
            line ?? "",
            envConfig().databases.influxdb.primary.database,
        )
    }

    /**
     * Writes price window result to the primary InfluxDB price bucket.
     *
     * @param params - Parameters for writing price window result
     *
     * @example
     * await service.writePriceWindowResult({
     *   id: "token123",
     *   marketListingId: MarketListingId.Pyth,
     *   priceWindowResult: result
     * })
     */
    async writePriceWindowResult({
        id,
        marketListingId,
        priceWindowResult,
    }: WritePriceWindowResultParams): Promise<void> {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }

        // create the point with tags and fields
        const point = Point.measurement("price_window_result")
            .setTag("id",
                id)
            .setTag("market_listing_id",
                marketListingId)
            .setTag("momentum_state",
                priceWindowResult.momentumState)
            .setTag("shape",
                priceWindowResult.shape)
            .setField("twap",
                priceWindowResult.twap)
            .setField("max_price",
                priceWindowResult.maxPrice)
            .setField("min_price",
                priceWindowResult.minPrice)
            .setField("diff_price",
                priceWindowResult.diffPrice)
            .setField("range_pct",
                priceWindowResult.rangePct)
            .setField("from_low_to_last_pct",
                priceWindowResult.fromLowToLastPct)
            .setField("from_high_to_last_pct",
                priceWindowResult.fromHighToLastPct)
            .setField("drawdown_pct",
                priceWindowResult.drawdownPct)
            .setField("slope",
                priceWindowResult.slope)
            .setField("r2",
                priceWindowResult.r2)
            .setField("efficiency_ratio",
                priceWindowResult.efficiencyRatio)
            .setField("volatility",
                priceWindowResult.volatility)
            .setField("first_price",
                priceWindowResult.firstPrice)
            .setField("last_price",
                priceWindowResult.lastPrice)
            .setField("sample_count",
                priceWindowResult.sampleCount)
            .setField("peak_price",
                priceWindowResult.peakPrice)
            .setField("peak_index",
                priceWindowResult.peakIndex)
            .setField("bars_since_peak",
                priceWindowResult.barsSincePeak)
            .setField("drop_from_peak_pct",
                priceWindowResult.dropFromPeakPct)
            .setField("slope_from_peak_pct_per_bar",
                priceWindowResult.slopeFromPeakPctPerBar)
            .setField("vel_from_peak_pct_per_min",
                priceWindowResult.velFromPeakPctPerMin)
            .setField("trough_price",
                priceWindowResult.troughPrice)
            .setField("trough_index",
                priceWindowResult.troughIndex)
            .setField("bars_since_trough",
                priceWindowResult.barsSinceTrough)
            .setField("rise_from_trough_pct",
                priceWindowResult.riseFromTroughPct)
            .setField("slope_from_trough_pct_per_bar",
                priceWindowResult.slopeFromTroughPctPerBar)
            .setField("vel_from_trough_pct_per_min",
                priceWindowResult.velFromTroughPctPerMin)
            .setTimestamp(new Date(priceWindowResult.endTime))

        // convert the point to line protocol
        const line = point.toLineProtocol()

        // write the line protocol to the database
        await this.influxdbClient.write(
            line ?? "",
            envConfig().databases.influxdb.primary.database,
        )
    }
}
import {
    Injectable
} from "@nestjs/common"
import type {
    InfluxDBClient
} from "@influxdata/influxdb3-client"
import {
    Point
} from "@influxdata/influxdb3-client"
import {
    InjectPrimaryInfluxdb
} from "../influxdb.decorators"
import type {
    WritePriceWindowResultParams,
    QueryInfluxdbWindowResultBucketAsyncIteratorParams,
    QueryInfluxdbWindowResultBucketPromiseParams,
    PriceWindowResultPoint,
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
 * Service for the primary InfluxDB window result bucket.
 *
 * @example
 * const service = new PrimaryInfluxdbWindowResultBucketService(client, dayjs, lifecycle)
 * await service.write({ id: "token123", marketListingId: "pyth", priceWindowResult })
 */
@Injectable()
export class PrimaryInfluxdbWindowResultBucketService {
    /**
     * Constructor for the PrimaryInfluxdbWindowResultBucketService.
     *
     * @param influxdbClient - The InfluxDB client instance
     * @param dayjsService - The Dayjs service instance
     * @param influxdbLifecycleService - The InfluxDB lifecycle service instance
     */
    constructor(
        @InjectPrimaryInfluxdb()
        private readonly influxdbClient: InfluxDBClient,
        private readonly dayjsService: DayjsService,
        private readonly influxdbLifecycleService: PrimaryInfluxdbLifecycleService,
    ) {
    }

    /**
     * Writes a price window result to the primary InfluxDB window result bucket.
     *
     * @param param - Parameters for writing price window result
     * @returns Promise that resolves when write is complete
     *
     * @example
     * await service.write({
     *   id: "token123",
     *   marketListingId: "pyth",
     *   priceWindowResult: result
     * })
     */
    async write(
        param: WritePriceWindowResultParams
    ): Promise<void> {
        const {
            token0Id,
            token1Id,
            marketListing0Id,
            marketListing1Id,
            priceWindowResult,
        } = param

        // check if InfluxDB is initialized
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }

        // create the point with tags and fields
        const point = Point.measurement("price_window_result")
            .setTag("token_0_id",
                token0Id)
            .setTag("token_1_id",
                token1Id)
            .setTag("market_listing_0_id",
                marketListing0Id)
            .setTag("market_listing_1_id",
                marketListing1Id)
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

    /**
     * Gets price window results from the primary InfluxDB window result bucket as async iterator.
     *
     * @param param - Parameters for querying price window results
     * @returns Async iterator of price window result points
     *
     * @example
     * const iterator = service.queryAsyncIterator({
     *   id: "token123",
     *   intervalMs: 60000,
     *   marketListingId: "pyth"
     * })
     * for await (const point of iterator) {
     *   console.log(point)
     * }
     */
    queryAsyncIterator(
        param: QueryInfluxdbWindowResultBucketAsyncIteratorParams
    ): AsyncIterableIterator<PriceWindowResultPoint> {
        const {
            id,
            intervalMs,
            marketListingId,
        } = param

        // check if InfluxDB is initialized
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        // build SQL query for price window results
        const sql = `
        SELECT 
            id, 
            market_listing_id, 
            momentum_state,
            shape,
            twap,
            max_price,
            min_price,
            diff_price,
            range_pct,
            from_low_to_last_pct,
            from_high_to_last_pct,
            drawdown_pct,
            slope,
            r2,
            efficiency_ratio,
            volatility,
            first_price,
            last_price,
            sample_count,
            peak_price,
            peak_index,
            bars_since_peak,
            drop_from_peak_pct,
            slope_from_peak_pct_per_bar,
            vel_from_peak_pct_per_min,
            trough_price,
            trough_index,
            bars_since_trough,
            rise_from_trough_pct,
            slope_from_trough_pct_per_bar,
            vel_from_trough_pct_per_min,
            time
        FROM price_window_result
        WHERE id = $id
        AND market_listing_id = $marketListingId
        AND time >= now() - interval '${intervalMs} ms'
        ORDER BY time DESC
      `
        // execute query and return async iterator
        return this.influxdbClient.query(
            sql,
            envConfig().databases.influxdb.primary.database,
            {
                params: {
                    id,
                    marketListingId
                },
            }
        ) as AsyncIterableIterator<PriceWindowResultPoint>
    }

    /**
     * Queries price window results from the primary InfluxDB window result bucket.
     *
     * @param param - Parameters for querying price window results
     * @returns Promise resolving to an array of price window result points
     *
     * @example
     * const results = await service.queryPromise({
     *   id: "token123",
     *   intervalMs: 60000,
     *   marketListingId: "pyth"
     * })
     */
    async queryPromise(
        param: QueryInfluxdbWindowResultBucketPromiseParams
    ): Promise<Array<PriceWindowResultPoint>> {
        // get async iterator
        const asyncIterator = this.queryAsyncIterator(param)

        // convert async iterator to array
        return await lastValueFrom(from(asyncIterator).pipe(toArray()))
    }
}

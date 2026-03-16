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
            cexId,
        }: WriteInfluxdbPriceBucketParams
    ) {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        // create the point
        const point = Point.measurement("price")
            .setTag(
                "id",
                id)
            .setTag(
                "cex_id",
                cexId
            )
            .setField(
                "price",
                price.toNumber()
            )
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
            cexId,
        }: QueryInfluxdbPriceBucketAsyncIteratorParams
    ): AsyncIterableIterator<PricePoint> {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        const time = this.dayjsService.now().subtract(intervalMs,
            "millisecond").toDate().getTime()
        // build the SQL query
        const sql = `
        SELECT id, cex_id, price, time
        FROM price
        WHERE id = $id
        AND cex_id = $cexId
        AND time >= $time
        ORDER BY time ASC
      `
        // InfluxDB 3 client supports params in recent versions; if yours doesn't,
        // you'll need the fallback below.
        return this.influxdbClient.query(
            sql,
            envConfig().databases.influxdb.primary.database,
            {
                params: {
                    id,
                    cexId,
                    time
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
            cexId,
        }: QueryInfluxdbPriceBucketPromiseParams
    ): Promise<Array<PricePoint>> {
        // query the price points
        const asyncIterator = this.queryAsyncIterator(
            {
                id,
                intervalMs,
                cexId,
            }
        )
        // convert the async iterator to an array of price points
        return await lastValueFrom(from(asyncIterator).pipe(toArray()))
    }

    /**
     * Check if the price window is continuous.
     * @param pricePoints - The price points.
     * @param maxGapMs - The maximum gap in milliseconds.
     * @returns True if the price window is continuous, false otherwise.
     */
    public isPriceWindowContinuous(
        pricePoints: Array<PricePoint>
    ): boolean {
        if (pricePoints.length < envConfig().inspector.priceWindow.minSamples) {
            return true
        }
        for (let i = 1; i < pricePoints.length; i++) {
            const prev = typeof pricePoints[i - 1].time === "number"
                ? pricePoints[i - 1].time
                : new Date(pricePoints[i - 1].time).getTime()

            const curr = typeof pricePoints[i].time === "number"
                ? pricePoints[i].time
                : new Date(pricePoints[i].time).getTime()

            if (curr - prev > envConfig().inspector.priceWindow.maxGapMs) {
                return true
            }
        }
        return false
    }
}
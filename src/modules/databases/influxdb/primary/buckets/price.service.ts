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
}
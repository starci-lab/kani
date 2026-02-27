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
    WriteInfluxdbPriceBucket 
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
        }: WriteInfluxdbPriceBucket
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
}
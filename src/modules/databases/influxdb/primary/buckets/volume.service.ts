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
    QueryInfluxdbVolumeBucketAsyncIteratorParams,
    QueryInfluxdbVolumeBucketPromiseParams,
    VolumePoint,
    WriteInfluxdbVolumeBucketParams,
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
 * Service for the primary InfluxDB volume bucket.
 */
@Injectable()
export class PrimaryInfluxdbVolumeBucketService {
    /**
     * Constructor for the PrimaryInfluxdbVolumeBucketService.
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
     * Write a volume to the primary InfluxDB volume bucket.
     * @param params - The parameters for the volume.
     */
    async write(
        {
            id,
            volume,
            cexId,
        }: WriteInfluxdbVolumeBucketParams
    ) 
    {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        // create the point
        const point = Point.measurement("volume")
            .setTag(
                "id",
                id)
            .setTag(
                "cex_id",
                cexId
            )
            .setField(
                "volume",
                volume.toNumber()
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
     * Get a volume from the primary InfluxDB volume bucket.
     * @param params - The parameters for the volume.
     */
    queryAsyncIterator(
        {
            id,
            intervalMs,
            cexId,
        }: QueryInfluxdbVolumeBucketAsyncIteratorParams
    ): AsyncIterableIterator<VolumePoint> {
        if (!this.influxdbLifecycleService.initialized) {
            throw new InfluxDBNotInitializedException({
                database: envConfig().databases.influxdb.primary.database,
            })
        }
        // build the SQL query
        const sql = `
        SELECT id, cex_id, volume, time
        FROM volume
        WHERE id = $id
        AND cex_id = $cexId
        AND time >= now() - interval '${intervalMs} ms'
        ORDER BY time ASC
      `
        return this.influxdbClient.query(
            sql,
            envConfig().databases.influxdb.primary.database,
            {
                params: {
                    id,
                    cexId,
                },
            }
        ) as AsyncIterableIterator<VolumePoint>
    }

    /**
     * Query a volume from the primary InfluxDB volume bucket.
     * @param params - The parameters for the volume.
     */
    async queryPromise(
        {
            id,
            intervalMs,
            cexId,
        }: QueryInfluxdbVolumeBucketPromiseParams
    ): Promise<Array<VolumePoint>> {
        const asyncIterator = this.queryAsyncIterator(
            {
                id,
                intervalMs,
                cexId,
            }
        )
        return await lastValueFrom(from(asyncIterator).pipe(toArray()))
    }
}
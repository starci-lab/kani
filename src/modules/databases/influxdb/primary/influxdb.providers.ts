import {
    envConfig 
} from "@modules/env"
import {
    INFLUXDB_PRIMARY 
} from "./constants"
import {
    Provider 
} from "@nestjs/common"
import {
    InfluxDBClient
} from "@influxdata/influxdb3-client"

/**
 * Create a provider for the primary InfluxDB connection.
 */
export const createInfluxdbPrimaryProvider = (): Provider => ({
    provide: INFLUXDB_PRIMARY,
    useFactory: () => {
        return new InfluxDBClient({
            host: envConfig().databases.influxdb.primary.url,
            token: envConfig().databases.influxdb.primary.token,
            database: envConfig().databases.influxdb.primary.database,
        })
    },
})
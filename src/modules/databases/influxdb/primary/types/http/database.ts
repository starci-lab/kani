/**
 * Influx list databases response.
 */
export type InfluxListDatabasesResponse = Array<InfluxDatabase>

/**
 * Influx database.
 */
export interface InfluxDatabase {
    /** The database name. */
    "iox::database": string
}
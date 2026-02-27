import {
    InfluxDBClient
} from "@influxdata/influxdb3-client"
import {
    Injectable, OnModuleDestroy, OnModuleInit
} from "@nestjs/common"
import {
    InjectPrimaryInfluxdb
} from "./influxdb.decorators"
import {
    AxiosService
} from "@modules/axios"
import {
    envConfig
} from "@modules/env"
import {
    InfluxDatabase,
    InfluxListDatabasesResponse
} from "./types"
import {
    AxiosInstance
} from "axios"
import {
    RetryService,
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
/**
 * Service for the primary InfluxDB lifecycle.
 */
@Injectable()
export class PrimaryInfluxdbLifecycleService implements OnModuleDestroy, OnModuleInit {
    private axiosInstance: AxiosInstance
    public initialized = false
    constructor(
        @InjectPrimaryInfluxdb()
        private readonly influxdbClient: InfluxDBClient,
        private readonly axiosService: AxiosService,
        private readonly retryService: RetryService,
        private readonly winstonService: WinstonService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {
        this.axiosInstance = this.axiosService.create(
            {
                key: "influxdb",
                config: {
                    baseURL: envConfig().databases.influxdb.primary.url,
                }
            })
    }

    /**
     * Get the headers for the axios instance.
     */
    private getHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${envConfig().databases.influxdb.primary.token}`,
        }
    }
    /**
     * On module init.
     */
    async onModuleInit() {
        await this.retryService.retry({
            options: {
                retries: Infinity,
            },
            action: async () => {
                try {
                    // list databases
                    const response = await this.axiosInstance.get<InfluxListDatabasesResponse>(
                        "/api/v3/configure/database",
                        {
                            params: {
                                format: "json" 
                            }, 
                            headers: this.getHeaders() 
                        }
                    )
                    const databases: Array<InfluxDatabase> = response.data ?? []
                    const exists = databases.some(database => database["iox::database"] === envConfig().databases.influxdb.primary.database)
                    // if database not found, create it
                    if (!exists) {
                        await this.axiosInstance.post(
                            "/api/v3/configure/database",
                            {
                                db: envConfig().databases.influxdb.primary.database,
                                retention_period: envConfig().databases.influxdb.primary.retentionPeriod,
                            },
                            {
                                headers: this.getHeaders(),
                            }
                        )
                    }
                    this.winstonService.log(
                        WinstonLog.InfluxDBBootstrappedSuccessfully,
                        {
                            database: envConfig().databases.influxdb.primary.database,
                        }
                    )
                } catch (error) {
                    this.winstonService.log(
                        WinstonLog.InfluxDBBootstrappedFailed,
                        {
                            error: error.message,
                            database: envConfig().databases.influxdb.primary.database,
                        }
                    )
                    throw error
                }
            }
        })
        this.initialized = true
    }

    /**
     * On module destroy.
     */
    async onModuleDestroy() {
        await this.influxdbClient.close()
    }
}
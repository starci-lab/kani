import {
    Injectable 
} from "@nestjs/common"
import {
    HealthIndicatorResult, MongooseHealthIndicator 
} from "@nestjs/terminus"
import {
    DependencyName 
} from "./config"
import {
    ModuleRef 
} from "@nestjs/core"
import {
    Connection 
} from "mongoose"
import {
    getPrimaryConnectionToken 
} from "@modules/databases"

export type MongodbTarget = "primary"

/**
 * The service for the MongoDB.
 */
@Injectable()
export class MongodbService {
    constructor(
        private readonly db: MongooseHealthIndicator,
        private readonly moduleRef: ModuleRef,
    ) {}

    /**
     * Ping the Primary MongoDB.
     * @returns The health check result.
     */
    async pingPrimaryMongodb(): Promise<HealthIndicatorResult> {
        const connection = this.moduleRef.get<Connection>(
            getPrimaryConnectionToken(),
            {
                strict: false 
            }
        )
        return this.db.pingCheck(
            DependencyName.MongodbPrimary,
            {
                connection
            }
        )
    }
}
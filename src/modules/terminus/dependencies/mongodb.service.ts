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
@Injectable()
export class MongodbService {
    constructor(
        private readonly db: MongooseHealthIndicator,
        private readonly moduleRef: ModuleRef,
    ) {}

    /**
     * Health check for Primary MongoDB
     */
    async pingPrimaryMongodb(): Promise<HealthIndicatorResult> {
        const connection = this.moduleRef.get<Connection>(
            getPrimaryConnectionToken(),
            {
                strict: false 
            })
        return this.db.pingCheck(
            DependencyName.MongodbPrimary,
            {
                connection
            }
        )
    }
}
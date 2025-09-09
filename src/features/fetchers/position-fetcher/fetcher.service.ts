import { Injectable } from "@nestjs/common"
import { 
    DEFAULT_DB_CONNECTION, 
} from "@modules/databases"
import { envConfig, LpBotType } from "@modules/env"
import { Connection } from "mongoose"
import { ModuleRef } from "@nestjs/core"

@Injectable()
export class FetcherService {
    private readonly connection: Connection
    constructor(
        private readonly moduleRef: ModuleRef
    ) {
        if (envConfig().lpBot.type === LpBotType.System) {
            this.connection = this.moduleRef.get<Connection>(DEFAULT_DB_CONNECTION)
        }
    }
}

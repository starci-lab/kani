import { Injectable } from "@nestjs/common"
import { 
    DEFAULT_DB_CONNECTION, 
    InstanceSchema, 
    UserAllocationLike, 
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

    async fetchUserAllocations(): Promise<Array<Partial<UserAllocationLike>>> {
        if (envConfig().lpBot.type === LpBotType.System) {
            return [
                {
                    suiWallet: envConfig().lpBot.suiWallet,
                    evmWallet: envConfig().lpBot.evmWallet,
                    solanaWallet: envConfig().lpBot.solanaWallet,
                }
            ]
        }
        const instance = await this.connection.model<InstanceSchema>(InstanceSchema.name).findOne({
            _id: envConfig().lpBot.instanceId,
        })
        if (!instance) {
            throw new Error("Instance not found")
        }
        return instance.userAllocations
    }
}

import {
    ConfigId 
} from "../enums"
import {
    ChainId, DeepPartial 
} from "@modules/typedefs"
import {
    ConfigSchema 
} from "../schemas"
import {
    Seeder 
} from "./seeder.interface"
import {
    InjectPrimaryMongoose 
} from "../mongodb.decorators"
import {
    Connection 
} from "mongoose"
import {
    Injectable 
} from "@nestjs/common"
import {
    createObjectId 
} from "@modules/utils"

@Injectable()
export class ConfigService implements Seeder {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async seed(): Promise<void> {
        await this.connection.model<ConfigSchema>(ConfigSchema.name).create(data)
    }

    async drop(): Promise<void> {
        await this.connection.model<ConfigSchema>(ConfigSchema.name).deleteMany({
        })
    }
}   

export const data: Array<DeepPartial<ConfigSchema>> = [
    {
        _id: createObjectId(ConfigId.Gas),
        displayId: ConfigId.Gas,
        value: {
            gasAmountRequired: {
                [ChainId.Sui]: {
                    minOperationalAmount: 0.05, // 25%
                    targetOperationalAmount: 0.2, // 100%
                    gasSwapThresholdAmount: 0.15, // 75%
                    additionalSwapAmount: 0.1, // 50%
                },
                [ChainId.Solana]: {
                    minOperationalAmount: 0.025, // 25%
                    targetOperationalAmount: 0.1, // 100%
                    swapThresholdAmount: 0.075, // 75%
                    additionalSwapAmount: 0.05, // 50%
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.Balance),
        displayId: ConfigId.Balance,
        value: {
            balanceRequired: {
                [ChainId.Sui]: {
                    minRequiredAmountInUsd: 20,
                },
                [ChainId.Solana]: {
                    minRequiredAmountInUsd: 20,
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.AccountLimits),
        displayId: ConfigId.AccountLimits,
        value: {
            maxBotsPerAccount: 10,
        },
    },
]
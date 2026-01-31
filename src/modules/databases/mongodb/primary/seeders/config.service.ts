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
                    swapAmount: 0.1, // 50%
                },
                [ChainId.Solana]: {
                    minOperationalAmount: 0.025, // 25%
                    targetOperationalAmount: 0.1, // 100%
                    swapAmount: 0.05, // 50%
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
    {
        _id: createObjectId(ConfigId.Avatars),
        displayId: ConfigId.Avatars,
        value: {
            avatarUrls: [
                "https://r2.starci.net/kani/1.png",
                "https://r2.starci.net/kani/2.png",
                "https://r2.starci.net/kani/3.png",
                "https://r2.starci.net/kani/4.png",
                "https://r2.starci.net/kani/5.png",
                "https://r2.starci.net/kani/6.png",
                "https://r2.starci.net/kani/7.png",
                "https://r2.starci.net/kani/8.png",
                "https://r2.starci.net/kani/9.png",
                "https://r2.starci.net/kani/10.png",
                "https://r2.starci.net/kani/11.png",
                "https://r2.starci.net/kani/12.png",
                "https://r2.starci.net/kani/13.png",
                "https://r2.starci.net/kani/14.png",
                "https://r2.starci.net/kani/15.png",
                "https://r2.starci.net/kani/16.png",
                "https://r2.starci.net/kani/17.png",
                "https://r2.starci.net/kani/18.png",
                "https://r2.starci.net/kani/19.png",
                "https://r2.starci.net/kani/20.png",
                "https://r2.starci.net/kani/21.png",
                "https://r2.starci.net/kani/22.png",
            ],
        },
    },
]
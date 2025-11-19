import { ConfigId, TokenId } from "../enums"
import { ChainId, DeepPartial, Network } from "@typedefs"
import { ConfigSchema } from "../schemas"
import { Seeder } from "nestjs-seeder"
import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { Connection } from "mongoose"
import { Injectable } from "@nestjs/common"
import { createObjectId } from "@utils"

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
        await this.connection.model<ConfigSchema>(ConfigSchema.name).deleteMany({})
    }
}   

export const data: Array<DeepPartial<ConfigSchema>> 
= [
    {
        _id: createObjectId(ConfigId.Gas),
        displayId: ConfigId.Gas,
        value: {
            minGasRequired: {
                [ChainId.Sui]: {
                    // you must remain at least 0.3 Sui for the gas fee to be able to process a transaction
                    [Network.Mainnet]: 0.3,
                    [Network.Testnet]: 0.3,
                },
                [ChainId.Solana]: {
                    // you must remain at least 0.1 SOL for the gas fee to be able to process a transaction
                    [Network.Mainnet]: 0.1,
                    [Network.Testnet]: 0.1,
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.TargetToken),
        displayId: ConfigId.TargetToken,
        value: {
            minTargetTokenRequired: {
                [TokenId.SuiNative]: {
                    [Network.Mainnet]: 10, 
                    [Network.Testnet]: 10,
                },
                [TokenId.SolNative]: {
                    [Network.Mainnet]: 0.2,
                    [Network.Testnet]: 0.2,
                },
                [TokenId.SolUsdc]: {
                    [Network.Mainnet]: 20,
                    [Network.Testnet]: 20,
                },
                [TokenId.SolUsdt]: {
                    [Network.Mainnet]: 20,
                    [Network.Testnet]: 20,
                },
            },
        },
    },
]
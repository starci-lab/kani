import { ConfigId } from "../enums"
import { ChainId, DeepPartial, Network } from "@typedefs"
import { ConfigSchema } from "../schemas"
import { Seeder } from "nestjs-seeder"
import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { Connection } from "mongoose"
import { Injectable } from "@nestjs/common"
import { computeRaw, createObjectId } from "@utils"
import Decimal from "decimal.js"

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

export const data: Array<DeepPartial<ConfigSchema>> = [
    {
        _id: createObjectId(ConfigId.Gas),
        displayId: ConfigId.Gas,
        value: {
            gasAmountRequired: {
                [ChainId.Sui]: {
                    [Network.Mainnet]: {
                        minOperationalAmount: computeRaw(new Decimal(0.25), 9).toString(),
                        targetOperationalAmount: computeRaw(new Decimal(0.5), 9).toString(),
                    },
                    [Network.Testnet]: {
                        minOperationalAmount: computeRaw(new Decimal(0.25), 9).toString(),
                        targetOperationalAmount: computeRaw(new Decimal(0.5), 9).toString(),
                    },
                },
                [ChainId.Solana]: {
                    [Network.Mainnet]: {
                        minOperationalAmount: computeRaw(new Decimal(0.05), 9).toString(),
                        targetOperationalAmount: computeRaw(new Decimal(0.1), 9).toString(),
                    },
                    [Network.Testnet]: {
                        minOperationalAmount: computeRaw(new Decimal(0.05), 9).toString(),
                        targetOperationalAmount: computeRaw(new Decimal(0.1), 9).toString(),
                    },
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.Fee),
        displayId: ConfigId.Fee,
        value: {
            feeInfo: {
                [ChainId.Solana]: {
                    [Network.Mainnet]: {
                        feeRate: 0.04, // 4%
                        feeToAddress: "8xqsA3rsyXesnrGTimQM7CamXLoptskrN6L423buggsZ",
                    },
                    [Network.Testnet]: {
                        feeRate: 0.04, // 4%
                        feeToAddress: "8xqsA3rsyXesnrGTimQM7CamXLoptskrN6L423buggsZ",
                    },
                },
            },
        },
    },
]
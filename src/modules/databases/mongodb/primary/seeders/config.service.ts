import { ConfigId } from "../enums"
import { ChainId, DeepPartial } from "@typedefs"
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
                    minOperationalAmount: computeRaw(new Decimal(0.25), 9).toString(),
                    targetOperationalAmount: computeRaw(new Decimal(1), 9).toString(),
                },
                [ChainId.Solana]: {
                    minOperationalAmount: computeRaw(new Decimal(0.025), 9).toString(),
                    targetOperationalAmount: computeRaw(new Decimal(0.1), 9).toString(),
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
                    feeRate: new Decimal(0.00005).toNumber(), // 0.005%
                    feeToAddress: "8xqsA3rsyXesnrGTimQM7CamXLoptskrN6L423buggsZ",
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.Client),
        displayId: ConfigId.Client,
        value: {
            cetusAggregatorClientRpcs: [
                "https://api.zan.top/node/v1/eth/mainnet/22d120019ccb45599c4c09f715e0f42b",
                "https://fullnode.mainnet.sui.io:443"
            ],
            sevenKAggregatorClientRpcs: [
                "https://api.zan.top/node/v1/eth/mainnet/22d120019ccb45599c4c09f715e0f42b",
                "https://fullnode.mainnet.sui.io:443"
            ],
            cetusClmmClientRpcs: [
                "https://fullnode.mainnet.sui.io:443",
                "https://api.zan.top/node/v1/eth/mainnet/22d120019ccb45599c4c09f715e0f42b",
            ],
            turbosClmmClientRpcs: [
                "https://fullnode.mainnet.sui.io:443",
                "https://api.zan.top/node/v1/eth/mainnet/22d120019ccb45599c4c09f715e0f42b",
            ],
            momentumClmmClientRpcs: [
                "https://fullnode.mainnet.sui.io:443",
                "https://api.zan.top/node/v1/eth/mainnet/22d120019ccb45599c4c09f715e0f42b",
            ],
            flowXClmmClientRpcs: [
                "https://fullnode.mainnet.sui.io:443",
                "https://api.flowx.finance/v1/rpc",
            ],
            jupiterAggregatorClientRpcs: [
                "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                "https://api.mainnet-beta.solana.com",
            ],
            raydiumClmmClientRpcs: [
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
            ],
            orcaAggregatorClientRpcs: [
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
            ],
            meteoraAggregatorClientRpcs: [
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
            ],
        }
    },
]
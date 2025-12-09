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
                [ChainId.Sui]: {
                    feeRate: new Decimal(0.00005).toNumber(), // 0.005%
                    feeToAddress: "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030",
                },
            },
        },
    },
    {
        _id: createObjectId(ConfigId.Client),
        displayId: ConfigId.Client,
        value: {
            // ============================================
            // Solana
            // ============================================
            jupiterAggregatorClientRpcs: {
                read: [
                    //"https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                    "https://api.mainnet-beta.solana.com",
                ],
                write: [
                    "https://mainnet.helius-rpc.com/?api-key=195f7f46-73d5-46df-989e-9d743bf3caad",
                ],
            },
            solanaBalanceClientRpcs: {
                read: [
                    "https://api.mainnet-beta.solana.com",
                    //"https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                ],
                write: [
                    "https://mainnet.helius-rpc.com/?api-key=195f7f46-73d5-46df-989e-9d743bf3caad",
                ],
            },
            meteoraDlmmClientRpcs: {
                read: [
                    //"https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                    "https://api.mainnet-beta.solana.com",
                ],
                write: [
                    "https://mainnet.helius-rpc.com/?api-key=195f7f46-73d5-46df-989e-9d743bf3caad",
                ],
            },
            raydiumClmmClientRpcs: {
                read: [
                    "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                    "https://api.mainnet-beta.solana.com",
                ],
                write: [
                    "https://mainnet.helius-rpc.com/?api-key=195f7f46-73d5-46df-989e-9d743bf3caad",
                ],
            },
            orcaClmmClientRpcs: {
                read: [
                    "https://solana-mainnet.g.alchemy.com/v2/wierg6LWs6JArNzP7lCHFItwg4PXqpGA",
                    "https://api.mainnet-beta.solana.com",
                ],
                write: [
                    "https://mainnet.helius-rpc.com/?api-key=195f7f46-73d5-46df-989e-9d743bf3caad",
                ],
            },
            // ============================================
            // Sui
            // ============================================
            suiBalanceClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443",
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            cetusAggregatorClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443"
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            sevenKAggregatorClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443"
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            cetusClmmClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443",
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            momentumClmmClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443",
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            flowXClmmClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443",
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
            turbosClmmClientRpcs: {
                read: [
                    "https://fullnode.mainnet.sui.io:443",
                ],
                write: [
                    "https://api.zan.top/node/v1/sui/mainnet/22d120019ccb45599c4c09f715e0f42b",
                ],
            },
        },
    },
]


export enum LoadBalancerName {
    CetusAggregator = "cetus-aggregator",
    SevenKAggregator = "7k-aggregator",
    CetusClmm = "cetus-clmm",
    TurbosClmm = "turbos-clmm",
    MomentumClmm = "momentum-clmm",
    FlowXClmm = "flowx-clmm",
    JupiterAggregator = "jupiter-aggregator",
    RaydiumClmm = "raydium-clmm",
    OrcaClmm = "orca-clmm",
    MeteoraDlmm = "meteora-dlmm",
    SolanaBalance = "solana-balance",
    SuiBalance = "sui-balance",
}
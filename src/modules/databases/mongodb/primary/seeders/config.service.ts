import { ConfigId } from "../enums"
import { ChainId, DeepPartial } from "@typedefs"
import { ConfigSchema } from "../schemas"
import { Seeder } from "./seeder.interface"
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
        _id: createObjectId(ConfigId.Balance),
        displayId: ConfigId.Balance,
        value: {
            balanceRequired: {
                [ChainId.Sui]: {
                    minRequiredAmountInUsd: 20,
                },
                [ChainId.Solana]: {
                    minRequiredAmountInUsd: 50,
                },
            },
        },
    }
]
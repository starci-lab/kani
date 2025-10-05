import { Connection } from "mongoose"
import { InjectMongoose } from "../../mongoose.decorators"
import { ConfigSchema } from "../../schemas"
import { ChainId, DeepPartial, Network } from "@modules/common"
import { ConfigId } from "../../../enums"
import { Injectable, Logger } from "@nestjs/common"

const data: Array<DeepPartial<ConfigSchema>> = [
    {
        displayId: ConfigId.Gas,
        value: {
            // 0.3 native token
            minGasRequired: {
                [ChainId.Sui]: {
                    [Network.Mainnet]: 0.3,
                },
            },
        },
    },
]

@Injectable()
export class ConfigSeeder {
    private readonly logger = new Logger(ConfigSeeder.name)
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    public async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools...")
        await this.drop()
        try {
            await this.connection
                .model<ConfigSchema>(ConfigSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} LP pools successfully`)
        } catch (error) {
            this.logger.error("Failed to seed LP pools", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing LP pools...")
        const result = await this.connection
            .model<ConfigSchema>(ConfigSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} LP pools`)
    }
}   
import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { createObjectId } from "@modules/common"
import { DexSchema } from "../../schemas/dex.schema"
import { DexId } from "../../../enums"
import { InjectMongoose } from "../../mongoose.decorators"

@Injectable()
export class DexSeeder implements Seeder {
    private readonly logger = new Logger(DexSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    public async seed(): Promise<void> {
        this.logger.debug("Seeding dexes...")
        await this.drop()

        const data: Array<Partial<DexSchema>> = [
            {
                _id: createObjectId(DexId.Cetus),
                name: "Cetus",
                displayId: DexId.Cetus,
                description: "Cetus is a decentralized exchange on Sui.",
                website: "https://cetus.zone/",
                iconUrl: "https://assets.coingecko.com/coins/images/32311/large/cetus.png",
            },
        ]

        try {
            await this.connection
                .model<DexSchema>(DexSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} dexes successfully`)
        } catch (error) {
            this.logger.error("Failed to seed dexes", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing dexes...")
        const result = await this.connection
            .model<DexSchema>(DexSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} dexes`)
    }
}
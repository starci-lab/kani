import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { DexSchema } from "../../schemas/dex.schema"
import { InjectMongoose } from "../../mongoose.decorators"
import { DexId } from "../../../enums"
import { DeepPartial, createObjectId } from "@modules/common"

const data: Array<DeepPartial<DexSchema>> = [
    {
        _id: createObjectId(DexId.Cetus),
        displayId: DexId.Cetus,
        name: "Cetus",
        description: "Cetus is a decentralized exchange on Sui.",
        website: "https://cetus.zone/",
        iconUrl: "https://r2.starci.net/protocols/cetus.png",
    },
    {
        _id: createObjectId(DexId.Turbos),
        displayId: DexId.Turbos,
        name: "Turbos",
        description: "Turbos is a decentralized exchange on Sui.",
        website: "https://turbos.finance/",
        iconUrl: "https://r2.starci.net/protocols/turbos.jpg",
    },
    {
        _id: createObjectId(DexId.Momentum),
        displayId: DexId.Momentum,
        name: "Momentum",
        description: "Momentum is a decentralized exchange on Sui.",
        website: "https://momentum.xyz/",
        iconUrl: "https://r2.starci.net/protocols/mmt.png",
    },
    {
        _id: createObjectId(DexId.FlowX),
        displayId: DexId.FlowX,
        name: "FlowX",
        description: "FlowX is a decentralized exchange on Sui.",
        website: "https://flowx.finance/",
        iconUrl: "https://r2.starci.net/protocols/flowx.png",
    },
]

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
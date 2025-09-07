import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { createObjectId, Network } from "@modules/common"
import { LpPoolSchema } from "../../schemas"
import { DexId, LpPoolId, TokenId } from "../../../enums"
import { InjectMongoose } from "../../mongoose.decorators"

@Injectable()
export class LpPoolSeeder implements Seeder {
    private readonly logger = new Logger(LpPoolSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    public async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools...")
        await this.drop()

        const data: Array<Partial<LpPoolSchema>> = [
            {
                _id: createObjectId(LpPoolId.CetusSuiIka02),
                displayId: LpPoolId.CetusSuiIka02,
                fee: 0.002,
                poolAddress: "0xc23e7e8a74f0b18af4dfb7c3280e2a56916ec4d41e14416f85184a8aab6b7789",
                tokenA: createObjectId(TokenId.SuiIka),
                tokenB: createObjectId(TokenId.SuiUsdc),
                network: Network.Mainnet,
                dex: createObjectId(DexId.Cetus),
            },
            {
                _id: createObjectId(LpPoolId.CetusSuiUsdc005),
                displayId: LpPoolId.CetusSuiUsdc005,
                fee: 0.0005,
                poolAddress: "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
                tokenA: createObjectId(TokenId.SuiUsdc),
                tokenB: createObjectId(TokenId.SuiCetus),
                network: Network.Mainnet,
                dex: createObjectId(DexId.Cetus),
            },
        ]

        try {
            await this.connection
                .model<LpPoolSchema>(LpPoolSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} LP pools successfully`)
        } catch (error) {
            this.logger.error("Failed to seed LP pools", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing LP pools...")
        const result = await this.connection
            .model<LpPoolSchema>(LpPoolSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} LP pools`)
    }
}
import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { createObjectId } from "@modules/common"
import { LiquidityPoolSchema } from "../../schemas"
import { InjectMongoose } from "../../mongoose.decorators"
import { lpPoolData } from "../../../data"

@Injectable()
export class LiquidityPoolSeeder implements Seeder {
    private readonly logger = new Logger(LiquidityPoolSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    public async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools...")
        await this.drop()

        const data: Array<Partial<LiquidityPoolSchema>> = lpPoolData.map(lpPool => ({
            _id: createObjectId(lpPool.displayId),
            displayId: lpPool.displayId,
            fee: lpPool.fee,
            poolAddress: lpPool.poolAddress,
            tokenA: createObjectId(lpPool.tokenAId),
            tokenB: createObjectId(lpPool.tokenBId),
            network: lpPool.network,
            dex: createObjectId(lpPool.dexId),
        }))

        try {
            await this.connection
                .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} LP pools successfully`)
        } catch (error) {
            this.logger.error("Failed to seed LP pools", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing LP pools...")
        const result = await this.connection
            .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} LP pools`)
    }
}
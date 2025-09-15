import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { createObjectId } from "@modules/common"
import { LiquidityPoolSchema } from "../../schemas"
import { InjectMongoose } from "../../mongoose.decorators"
import { liquidityPoolData } from "../../../data"

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

        const data: Array<Partial<LiquidityPoolSchema>> = liquidityPoolData.map(liquidityPool => ({
            _id: createObjectId(liquidityPool.displayId),
            displayId: liquidityPool.displayId,
            fee: liquidityPool.fee,
            poolAddress: liquidityPool.poolAddress,
            tokenA: createObjectId(liquidityPool.tokenAId),
            tokenB: createObjectId(liquidityPool.tokenBId),
            network: liquidityPool.network,
            dex: createObjectId(liquidityPool.dexId),
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
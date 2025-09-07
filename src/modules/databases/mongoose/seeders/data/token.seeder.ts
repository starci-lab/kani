import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { createObjectId } from "@modules/common"
import { TokenSchema } from "../../schemas"
import { InjectMongoose } from "../../mongoose.decorators"
import { tokenData } from "../../../data"

@Injectable()
export class TokenSeeder implements Seeder {
    private readonly logger = new Logger(TokenSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection
    ) { }

    public async seed(): Promise<void> {
        this.logger.debug("Seeding tokens...")
        await this.drop()

        const data: Array<Partial<TokenSchema>> = tokenData.map(token => ({
            _id: createObjectId(token.displayId),
            ...token,
        }))

        try {
            await this.connection
                .model<TokenSchema>(TokenSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} tokens successfully`)
        } catch (error) {
            this.logger.error("Failed to seed tokens", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing tokens...")
        const result = await this.connection
            .model<TokenSchema>(TokenSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} tokens`)
    }
}
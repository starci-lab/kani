
import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { Connection } from "mongoose"
import { RetryService } from "@modules/mixin"
import { Cron, CronExpression } from "@nestjs/schedule"
import { TokenSchema } from "../schemas"
import { InjectMongoose } from "../mongoose.decorators"

@Injectable()
export class MemDbService implements OnModuleInit {
    private readonly logger = new Logger(MemDbService.name)
    public tokens: Array<TokenSchema> = []
    constructor(
    private readonly retryService: RetryService,
    @InjectMongoose()
    private readonly connection: Connection,
    ) {}

    private async loadAll() {
        await Promise.all([
            (async () => {
                const tokens = await this.connection
                    .model<TokenSchema>(TokenSchema.name)
                    .find()
                this.tokens = tokens.map((token) => token.toJSON())
            })(),
        ])
    }

    async onModuleInit() {
        this.logger.verbose("Loading all data from memdb...")
        await this.retryService.retry({
            action: async () => {
                await this.loadAll()
            },
        })
        this.logger.log("Loaded all data from memdb")
    }

  @Cron(CronExpression.EVERY_30_SECONDS)
    async handleUpdate() {
        this.logger.verbose("Updating memdb...")
        await this.loadAll()
        this.logger.log("Updated memdb")
    }
}

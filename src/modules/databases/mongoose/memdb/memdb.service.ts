import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { Connection } from "mongoose"
import { RetryService } from "@modules/mixin"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ConfigSchema, GasConfig, LiquidityPoolSchema, TokenSchema } from "../schemas"
import { InjectMongoose } from "../mongoose.decorators"
import { DexSchema } from "../schemas"
import { ConfigId } from "../../enums"
import { KeyValueRecord } from "../types"

@Injectable()
export class MemDbService implements OnModuleInit {
    private readonly logger = new Logger(MemDbService.name)
    public tokens: Array<TokenSchema> = []
    public liquidityPools: Array<LiquidityPoolSchema> = []
    public dexes: Array<DexSchema> = []
    public gasConfig?: GasConfig
    constructor(
        private readonly retryService: RetryService,
        @InjectMongoose()
        private readonly connection: Connection,
    ) { }

    private async loadAll() {
        await Promise.all([
            (async () => {
                const tokens = await this.connection
                    .model<TokenSchema>(TokenSchema.name)
                    .find()
                this.tokens = tokens.map((token) => token.toJSON())
            })(),
            (async () => {
                const liquidityPools = await this.connection
                    .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                    .find()
                this.liquidityPools = liquidityPools.map((liquidityPool) => liquidityPool.toJSON())
            })(),
            (async () => {
                const dexes = await this.connection
                    .model<DexSchema>(DexSchema.name)
                    .find()
                this.dexes = dexes.map((dex) => dex.toJSON())
            })(),
            (async () => {
                const gasConfig = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findOne<KeyValueRecord<GasConfig>>({
                        displayId: ConfigId.Gas,
                    })
                this.gasConfig = gasConfig?.value
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

    public populateLiquidityPools() {
        return this.liquidityPools.map((liquidityPool) => {
            return {
                ...liquidityPool,
                tokenA: this.tokens.find(
                    (token) => token.id.toString() === liquidityPool.tokenA.toString(),
                ),
                tokenB: this.tokens.find(
                    (token) => token.id.toString() === liquidityPool.tokenB.toString(),
                ),
            }
        })
    }
}

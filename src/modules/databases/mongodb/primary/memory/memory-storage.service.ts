import { Inject, Injectable, OnModuleInit } from "@nestjs/common"
import { DexSchema, GasConfig, LiquidityPoolSchema, TargetTokenConfig, TokenSchema } from "../schemas"
import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { Connection } from "mongoose"
import { AsyncService, RetryService } from "@modules/mixin"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./memory.module-definition"
import { ConfigSchema } from "../schemas"
import { ConfigId } from "../enums"
import { createObjectId } from "@utils"
import { GasConfigNotFoundException, TargetTokenConfigNotFoundException } from "@exceptions"

@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    public tokens: Array<TokenSchema> = []
    public liquidityPools: Array<LiquidityPoolSchema> = []
    public dexes: Array<DexSchema> = []
    public gasConfig: GasConfig
    public targetTokenConfig: TargetTokenConfig

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService
    ) { }

    private async process() {
        await this.asyncService.allMustDone([
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const tokens = await this.connection
                            .model<TokenSchema>(TokenSchema.name)
                            .find()
                        this.tokens = tokens.map(token => token.toJSON())
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const liquidityPools = await this.connection
                            .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                            .find()
                        this.liquidityPools = liquidityPools.map(liquidityPool => liquidityPool.toJSON())
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const dexes = await this.connection
                            .model<DexSchema>(DexSchema.name)
                            .find()
                        this.dexes = dexes.map(dex => dex.toJSON())
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const gasConfig = await this.connection
                            .model<ConfigSchema>(ConfigSchema.name)
                            .findById(createObjectId(ConfigId.Gas))
                        if (!gasConfig) {
                            throw new GasConfigNotFoundException("Gas config not found")
                        }
                        this.gasConfig = gasConfig.value as unknown as GasConfig
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const targetTokenConfig = await this.connection
                            .model<ConfigSchema>(ConfigSchema.name)
                            .findById(createObjectId(ConfigId.TargetToken))
                        if (!targetTokenConfig) {
                            throw new TargetTokenConfigNotFoundException("Target token config not found")
                        }
                        this.targetTokenConfig = targetTokenConfig.value as unknown as TargetTokenConfig
                    },
                })
            })(),
        ])
    }

    // on module init, load all data from memory
    async onModuleInit() {
        // if manual load, do not load
        if (this.options.manualLoad) {
            return
        }
        await this.process()
    }

    // load all data from memory
    async load() {
        await this.process()
    }
}   
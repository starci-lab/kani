import { Inject, Injectable, OnModuleInit } from "@nestjs/common"
import { DexSchema, GasConfig, LiquidityPoolSchema, TokenSchema } from "../schemas"
import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { Connection } from "mongoose"
import { AsyncService, ReadinessWatcherFactoryService, RetryService } from "@modules/mixin"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./memory.module-definition"
import { BalanceConfig, ConfigRecord, ConfigSchema } from "../schemas"
import { ConfigId } from "../enums"
import { createObjectId } from "@utils"
import { BalanceConfigNotFoundException, GasConfigNotFoundException } from "@exceptions"
import { envConfig } from "@modules/env"

@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    public tokens: Array<TokenSchema> = []
    public liquidityPools: Array<LiquidityPoolSchema> = []
    public dexes: Array<DexSchema> = []
    public gasConfig: GasConfig
    public balanceConfig: BalanceConfig
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
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
                    delay: envConfig().timeConfig.retry.delay,
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    factor: envConfig().timeConfig.retry.factor,
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const gasConfig = await this.connection
                            .model<ConfigSchema>(ConfigSchema.name)
                            .findById<ConfigRecord<GasConfig>>(createObjectId(ConfigId.Gas))
                        if (!gasConfig) {
                            throw new GasConfigNotFoundException("Gas config not found")
                        }
                        this.gasConfig = gasConfig.value
                    },
                    delay: envConfig().timeConfig.retry.delay,
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    factor: envConfig().timeConfig.retry.factor,
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const balanceConfig = await this.connection
                            .model<ConfigSchema>(ConfigSchema.name)
                            .findById<ConfigRecord<BalanceConfig>>(createObjectId(ConfigId.Balance))
                        if (!balanceConfig) {
                            throw new BalanceConfigNotFoundException("Balance config not found")
                        }
                        this.balanceConfig = balanceConfig.value
                    },
                    delay: envConfig().timeConfig.retry.delay,
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    factor: envConfig().timeConfig.retry.factor,
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
        this.readinessWatcherFactoryService.createWatcher(PrimaryMemoryStorageService.name)
        await this.process()
        this.readinessWatcherFactoryService.setReady(PrimaryMemoryStorageService.name)
    }

    // load all data from memory
    async load() {
        await this.process()
    }
}   
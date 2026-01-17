import { Inject, Injectable, OnModuleInit } from "@nestjs/common"
import { DexSchema, GasConfig, LiquidityPoolSchema, TokenSchema } from "../schemas"
import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { Connection } from "mongoose"
import { AsyncService, ReadinessWatcherFactoryService, RetryService } from "@modules/mixin"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./memory.module-definition"
import { AccountLimitsConfig, BalanceConfig, ConfigRecord, ConfigSchema } from "../schemas"
import { ConfigId } from "../enums"
import { createObjectId } from "@utils"
import { AccountLimitsConfigNotFoundException, BalanceConfigNotFoundException, GasConfigNotFoundException } from "@exceptions"

@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    // tokens
    public tokenArray: Array<TokenSchema> = []
    public tokenMap: Map<string, TokenSchema> = new Map()
    // liquidity pools
    public liquidityPoolArray: Array<LiquidityPoolSchema> = []
    public liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    // dexes
    public dexArray: Array<DexSchema> = []
    public dexMap: Map<string, DexSchema> = new Map()
    // gas config
    public gasConfig: GasConfig
    public balanceConfig: BalanceConfig
    public accountLimits: AccountLimitsConfig
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
                        this.tokenArray = tokens.map(token => token.toJSON())
                        this.tokenMap = new Map(tokens.map(token => [token.id, token]))
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const liquidityPools = await this.connection
                            .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                            .find()
                        this.liquidityPoolArray = liquidityPools.map(liquidityPool => liquidityPool.toJSON())
                        this.liquidityPoolMap = new Map(liquidityPools.map(liquidityPool => [liquidityPool.id, liquidityPool]))
                    },
                })
            })(),
            (async () => {
                await this.retryService.retry({
                    action: async () => {
                        const dexes = await this.connection
                            .model<DexSchema>(DexSchema.name)
                            .find()
                        this.dexArray = dexes.map(dex => dex.toJSON())
                        this.dexMap = new Map(dexes.map(dex => [dex.id, dex]))
                    },
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
                })
            })(),
            (async () => {
                await this.retryService.retry(
                    {
                        action: async () => {
                            const accountLimits = await this.connection
                                .model<ConfigSchema>(ConfigSchema.name)
                                .findById<ConfigRecord<AccountLimitsConfig>>(createObjectId(ConfigId.AccountLimits))
                            if (!accountLimits) {
                                throw new AccountLimitsConfigNotFoundException("Account limits config not found")
                            }
                            this.accountLimits = accountLimits.value
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
        this.readinessWatcherFactoryService.createWatcher(PrimaryMemoryStorageService.name)
        await this.process()
        this.readinessWatcherFactoryService.setReady(PrimaryMemoryStorageService.name)
    }

    // load all data from memory
    async load() {
        await this.process()
    }
}   
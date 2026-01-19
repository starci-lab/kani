import {
    Inject, Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    DexSchema, GasConfig, LiquidityPoolSchema, TokenSchema 
} from "../schemas"
import {
    InjectPrimaryMongoose 
} from "../mongodb.decorators"
import {
    Connection 
} from "mongoose"
import {
    AsyncService, LokiJSService, ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./memory.module-definition"
import {
    AccountLimitsConfig, BalanceConfig, ConfigRecord, ConfigSchema 
} from "../schemas"
import {
    ConfigId 
} from "../enums"
import {
    createObjectId 
} from "@modules/utils"
import { 
    AccountLimitsConfigNotFoundException, 
    BalanceConfigNotFoundException, 
    GasConfigNotFoundException 
} from "@modules/exceptions"

@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    // configs
    public gasConfig: GasConfig
    public balanceConfig: BalanceConfig
    public accountLimits: AccountLimitsConfig
    // collections
    public tokenCollection: Collection<TokenSchema>
    public liquidityPoolCollection: Collection<LiquidityPoolSchema>
    public dexCollection: Collection<DexSchema>
    // constructor
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    private async process() {
        await this.asyncService.allMustDone([
            (async () => {
                const tokens = await this.connection
                    .model<TokenSchema>(TokenSchema.name)
                    .find()
                this.tokenCollection = await this.lokiJSService.createCollection<
                        TokenSchema
                        >(
                            "tokens",
                            {
                                indices: 
                                ["tokenAddress",
                                    "displayId",
                                    "id"]
                            }
                        )
                this.tokenCollection.insert(tokens.map(token => token.toJSON()))
            })(),
            (async () => {
                const liquidityPools = await this.connection
                    .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                    .find()
                this.liquidityPoolCollection = await this.lokiJSService.createCollection<
                        LiquidityPoolSchema
                        >(
                            "liquidity_pools",
                            {
                                indices: 
                                ["poolAddress",
                                    "displayId",
                                    "id"]
                            }
                        )
                this.liquidityPoolCollection.insert(liquidityPools.map(liquidityPool => liquidityPool.toJSON()))
            })(),
            (async () => {
                const dexes = await this.connection
                    .model<DexSchema>(DexSchema.name)
                    .find()
                this.dexCollection = await this.lokiJSService.createCollection<
                        DexSchema
                        >(
                            "dexes",
                            {
                                indices: 
                                ["displayId",
                                    "id"]
                            }
                        )
                this.dexCollection.insert(dexes.map(dex => dex.toJSON()))
            })(),
            (async () => {
                const gasConfig = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findById<ConfigRecord<GasConfig>>(createObjectId(ConfigId.Gas))
                if (!gasConfig) {
                    throw new GasConfigNotFoundException({
                    })
                }
                this.gasConfig = gasConfig.value
            })(),
            (async () => {
                const balanceConfig = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findById<ConfigRecord<BalanceConfig>>(createObjectId(ConfigId.Balance))
                if (!balanceConfig) {
                    throw new BalanceConfigNotFoundException({
                    })
                }
                this.balanceConfig = balanceConfig.value
            })(),
            (async () => {
                const accountLimits = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findById<ConfigRecord<AccountLimitsConfig>>(createObjectId(ConfigId.AccountLimits))
                if (!accountLimits) {
                    throw new AccountLimitsConfigNotFoundException({
                    })
                }
                this.accountLimits = accountLimits.value
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
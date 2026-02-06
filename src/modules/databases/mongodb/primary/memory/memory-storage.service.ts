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
    Collection
} from "lokijs"
import {
    AsyncService, LokiJSService, ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE
} from "./memory.module-definition"
import {
    AccountLimitsConfig, AuthenticationConfig, AvatarsConfig, BalanceConfig, ConfigRecord, ConfigSchema
} from "../schemas"
import {
    ConfigId
} from "../enums"
import {
    createObjectId
} from "@modules/utils"
import {
    AccountLimitsConfigNotFoundException,
    AuthenticationConfigNotFoundException,
    AvatarsConfigNotFoundException,
    BalanceConfigNotFoundException,
    GasConfigNotFoundException
} from "@modules/exceptions"
import type {
    LoadResult 
} from "./types"

/**
 * In-memory cache of primary MongoDB data (tokens, liquidity pools, dexes, configs).
 * Uses LokiJS collections and loads from DB on init (unless manualLoad) or when load() is called.
 */
@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    public gasConfig: GasConfig
    public balanceConfig: BalanceConfig
    public accountLimits: AccountLimitsConfig
    public avatarsConfig: AvatarsConfig
    public authenticationConfig: AuthenticationConfig
    // collections
    public tokenCollection: Collection<TokenSchema>
    public liquidityPoolCollection: Collection<LiquidityPoolSchema>
    public dexCollection: Collection<DexSchema>

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    /** Load all collections and configs from MongoDB in parallel. */
    private async process(): Promise<void> {
        await this.asyncService.allMustDone([
            (async () => {
                const tokens = await this.connection
                    .model<TokenSchema>(TokenSchema.name)
                    .find()
                this.tokenCollection = await this.lokiJSService.createCollection<TokenSchema>(
                    TokenSchema.name,
                    {
                        indices: [
                            "tokenAddress",
                            "displayId",
                            "id",
                        ] 
                    },
                )
                this.tokenCollection.insert(tokens.map(token => token.toJSON()))
            })(),
            (async () => {
                const liquidityPools = await this.connection
                    .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                    .find()
                this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
                    LiquidityPoolSchema.name,
                    {
                        indices: [
                            "displayId",
                            "id",
                        ] 
                    },
                )
                this.liquidityPoolCollection.insert(liquidityPools.map(liquidityPool => liquidityPool.toJSON()))
            })(),
            (async () => {
                const dexes = await this.connection
                    .model<DexSchema>(DexSchema.name)
                    .find()
                this.dexCollection = await this.lokiJSService.createCollection<DexSchema>(
                    DexSchema.name,
                    {
                        indices: [
                            "displayId",
                            "id",
                        ] 
                    },
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
            (async () => {
                const avatarsConfig = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findById<ConfigRecord<AvatarsConfig>>(createObjectId(ConfigId.Avatars))
                if (!avatarsConfig) {
                    throw new AvatarsConfigNotFoundException({
                    })
                }
                this.avatarsConfig = avatarsConfig.value
            })(),
            (async () => {
                const authenticationConfig = await this.connection
                    .model<ConfigSchema>(ConfigSchema.name)
                    .findById<ConfigRecord<AuthenticationConfig>>(createObjectId(ConfigId.Authentication))
                if (!authenticationConfig) {
                    throw new AuthenticationConfigNotFoundException({
                    })
                }
                this.authenticationConfig = authenticationConfig.value
            })(),
        ])
    }

    /**
     * On module init: if not manualLoad, loads all data from MongoDB and marks service ready.
     */
    async onModuleInit(): Promise<void> {
        if (this.options.manualLoad) {
            return
        }
        this.readinessWatcherFactoryService.createWatcher(PrimaryMemoryStorageService.name)
        await this.process()
        this.readinessWatcherFactoryService.setReady(PrimaryMemoryStorageService.name)
    }

    /**
     * Load (or reload) all in-memory data from the database.
     */
    async load(): Promise<LoadResult> {
        await this.process()
    }
}   
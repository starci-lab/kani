import {
    Inject, Injectable, OnModuleInit
} from "@nestjs/common"
import {
    DexSchema, LiquidityPoolSchema, TokenSchema
} from "../schemas"
import {
    InjectPrimaryMongoose
} from "../mongodb.decorators"
import {
    Connection
} from "mongoose"
import {
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE
} from "./memory.module-definition"
import {
    TokenId
} from "../enums"
import {
    isSolanaWrapped,
    isSuiCoin
} from "@modules/common"
import type {
    LoadResult 
} from "./types"
import {
    SeedersService 
} from "../seeders"

/**
 * In-memory cache of primary MongoDB data (tokens, liquidity pools, dexes).
 * App config is provided by MountStorageService (.mount/config/app.json).
 */
@Injectable()
export class PrimaryMemoryStorageService implements OnModuleInit {
    public tokenMap: Map<string, TokenSchema>
    public liquidityPoolMap: Map<string, LiquidityPoolSchema>
    public dexMap: Map<string, DexSchema>

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) { }

    /** Load all data from MongoDB into maps. */
    private async process(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(SeedersService.name)
        const tokens = (
            await this.connection
                .model<TokenSchema>(TokenSchema.name)
                .find()
        ).map(token => token.toJSON())
        this.tokenMap = new Map(
            tokens.map(token => [
                token.id,
                token
            ]))     
        const liquidityPools = (
            await this.connection
                .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                .find()
        ).map(liquidityPool => liquidityPool.toJSON())
        this.liquidityPoolMap = new Map(
            liquidityPools.map(
                liquidityPool => [
                    liquidityPool.id,
                    liquidityPool
                ]))     
        const dexes = (
            await this.connection
                .model<DexSchema>(DexSchema.name)
                .find()
        ).map(dex => dex.toJSON())
        this.dexMap = new Map(
            dexes.map(dex => [
                dex.id,
                dex
            ]))     
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

    /**
     * Get a token by its address.
     */
    getTokenByAddress(tokenAddress: string): TokenSchema | undefined {
        if (isSuiCoin(tokenAddress)) {
            return Array.from(
                this.tokenMap.values())
                .find(token => token.displayId === TokenId.SuiNative 
                )
        } else if (isSolanaWrapped(tokenAddress)) {
            return Array.from(
                this.tokenMap.values())
                .find(
                    token => token.displayId === TokenId.SolNative
                )
        } else {
            return Array.from(
                this.tokenMap.values()
            ).find(
                token => token.tokenAddress === tokenAddress
            )
        }
    }
}   
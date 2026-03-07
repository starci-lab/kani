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
    Collection
} from "lokijs"
import {
    LokiJSService, ReadinessWatcherFactoryService
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
    // collections
    public tokenCollection: Collection<TokenSchema>
    public liquidityPoolCollection: Collection<LiquidityPoolSchema>
    public dexCollection: Collection<DexSchema>

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly lokiJSService: LokiJSService,
    ) { }

    /** Load all collections from MongoDB. */
    private async process(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(SeedersService.name)
        const tokens = await this.connection
            .model<TokenSchema>(TokenSchema.name)
            .find()
    
        this.tokenCollection = await this.lokiJSService.createCollection<TokenSchema>({
            name: "token-collection",
            options: {
                indices: [
                    "displayId",
                    "id"] 
            },
        })
        this.tokenCollection.insert(tokens.map(token => token.toJSON()))
        const liquidityPools = await this.connection
            .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
            .find()
    
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "liquidity-pool-collection",
            options: {
                indices: ["poolAddress",
                    "displayId",
                    "id"] 
            },
        })
        this.liquidityPoolCollection.insert(liquidityPools.map(liquidityPool => liquidityPool.toJSON()))
    
        const dexes = await this.connection
            .model<DexSchema>(DexSchema.name)
            .find()
    
        this.dexCollection = await this.lokiJSService.createCollection<DexSchema>({
            name: "dex-collection",
            options: {
                indices: ["displayId",
                    "id"] 
            },
        })
        this.dexCollection.insert(dexes.map(d => d.toJSON()))
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
     * @param tokenAddress - The address of the token.
     * @returns The token.
     */
    getTokenByAddress(
        tokenAddress: string
    ): TokenSchema | null {
        if (isSuiCoin(tokenAddress)) {
            return this.tokenCollection.findOne({
                displayId: {
                    $eq: TokenId.SuiNative,
                },
            })
        } else if (isSolanaWrapped(tokenAddress)) {
            return this.tokenCollection.findOne({
                displayId: {
                    $eq: TokenId.SolNative,
                },
            })
        } else {
            return this.tokenCollection.findOne({
                tokenAddress: {
                    $eq: tokenAddress,
                },
            })
        }
    }
}   
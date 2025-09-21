import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { 
    DexEntity, 
    DexLike, 
    LiquidityPoolEntity, 
    LiquidityPoolLike, 
    MemDbQueryService, 
    MemDbService, 
    TokenEntity, 
    TokenLike
} from "@modules/databases"
import { getDataSourceToken } from "@nestjs/typeorm"
import { ModuleRef } from "@nestjs/core"
import { envConfig, LpBotType } from "@modules/env"
import { DataSource } from "typeorm"
import { Connection } from "mongoose"
import { getConnectionToken } from "@nestjs/mongoose"

@Injectable()
export class DataLikeService implements OnModuleInit, OnApplicationBootstrap {
    private sqliteDataSource: DataSource
    private mongoDbConnection: Connection
    // a boolean to check whether the data is loaded
    public loaded = false

    public tokens: Array<TokenLike> = []
    public dexes: Array<DexLike> = []
    public liquidityPools: Array<LiquidityPoolLike> = []

    constructor(
        private readonly moduleRef: ModuleRef,
    ) {}

    onModuleInit() {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            this.mongoDbConnection = this.moduleRef.get(getConnectionToken(), { strict: false })
            break
        }
        case LpBotType.System: {
            this.sqliteDataSource = this.moduleRef.get(getDataSourceToken(), { strict: false })
            break
        }
        }
    }

    async onApplicationBootstrap() {
        // load data
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            await this.loadFromMongo()
            break
        }
        case LpBotType.System: {
            await this.loadFromSqlite()
            break
        }
        }
        this.loaded = true
    }   

    private async loadFromMongo() {
        const dexes = await this.mongoDbConnection.model(DexEntity.name).find()
        this.dexes = dexes.map((dex) => ({
            ...dex,
            id: dex.id,
        }))
        const memDbService = this.moduleRef.get(MemDbService,{strict: false})
        const memDbQueryService = this.moduleRef.get(MemDbQueryService,{strict: false})
        this.tokens = memDbService.tokens
        this.liquidityPools = memDbService.liquidityPools.map(liquidityPool => ({
            ...liquidityPool,
            dex: memDbQueryService.findDexById(liquidityPool.dex.toString()),
            tokenA: memDbQueryService.findTokenById(liquidityPool.tokenA.toString()),
            tokenB: memDbQueryService.findTokenById(liquidityPool.tokenB.toString()),
            tokenAId: memDbQueryService.findTokenById(liquidityPool.tokenA.toString())!.displayId,
            tokenBId: memDbQueryService.findTokenById(liquidityPool.tokenB.toString())!.displayId,
            dexId: memDbQueryService.findDexById(liquidityPool.dex.toString())!.displayId,
            farmTokenTypes: liquidityPool.farmTokenTypes,
            rewardTokenIds: [],
        }))
    }

    private async loadFromSqlite() {
        const tokens = await this.sqliteDataSource.manager.find(TokenEntity)
        this.tokens = tokens.map((token) => ({
            ...token,
            id: token.id,
            cexSymbols: token.cexSymbols,
        }
        ))
        const liquidityPools = await this.sqliteDataSource.manager.find(LiquidityPoolEntity, {
            relations: {
                tokenA: true,
                tokenB: true,
                rewardTokens: {
                    token: true
                }
            }
        })
        this.liquidityPools = liquidityPools.map((liquidityPool) => ({
            ...liquidityPool,
            rewardTokens: liquidityPool.rewardTokens.map((rewardToken) => ({
                ...rewardToken.token,
                id: rewardToken.id,
            })),
            id: liquidityPool.id,
        }))
        const dexes = await this.sqliteDataSource.manager.find(DexEntity)
        this.dexes = dexes.map((dex) => ({
            ...dex,
            id: dex.id,
        }))
    }
}
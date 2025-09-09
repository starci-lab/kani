import { Injectable } from "@nestjs/common"
import { DexEntity, DexLike, LiquidityPoolEntity, LiquidityPoolLike, MemDbQueryService, MemDbService, TokenEntity, TokenLike } from "@modules/databases"
import { getDataSourceToken } from "@nestjs/typeorm"
import { ModuleRef } from "@nestjs/core"
import { envConfig, LpBotType } from "@modules/env"

@Injectable()
export class DataLikeService {
    public tokens: Array<TokenLike> = []
    public dexes: Array<DexLike> = []
    public liquidityPools: Array<LiquidityPoolLike> = []
    constructor(
        private readonly moduleRef: ModuleRef,
    ) {}

    async onModuleInit() {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            this.loadFromMongo()
            break
        }
        case LpBotType.System: {
            this.loadFromSqlite()
            break
        }
        }
    }   

    private async loadFromMongo() {
        const dataSource = this.moduleRef.get(getDataSourceToken(), {strict: false})
        const dexes = await dataSource.manager.find(DexEntity)
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
        }))
    }

    private async loadFromSqlite() {
        const dataSource = this.moduleRef.get(getDataSourceToken(), {strict: false})
        const tokens = await dataSource.manager.find(TokenEntity)
        this.tokens = tokens.map((token) => ({
            ...token,
            id: token.id,
            cexSymbols: token.cexSymbols,
        }
        ))
        const liquidityPools = await dataSource.manager.find(LiquidityPoolEntity, {
            relations: {
                tokenA: true,
                tokenB: true
            }
        })
        this.liquidityPools = liquidityPools.map((liquidityPool) => ({
            ...liquidityPool,
            id: liquidityPool.id,
        }))
        const dexes = await dataSource.manager.find(DexEntity)
        this.dexes = dexes.map((dex) => ({
            ...dex,
            id: dex.id,
        }))
    }
}
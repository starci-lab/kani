import { Injectable, OnModuleInit } from "@nestjs/common"
import { DexId, LiquidityPoolId, PositionEntity } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import BN from "bn.js"
import { FetchedPool, LiquidityPoolService, OpenPositionResponse, PythService } from "@modules/blockchains"
import { Cache } from "cache-manager"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { ModuleRef } from "@nestjs/core"
import { DataSource } from "typeorm"
import { Connection } from "mongoose"
import { envConfig, LpBotType } from "@modules/env"
import { getDataSourceToken } from "@nestjs/typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger } from "winston"
import { DataLikeService } from "./data-like.service"
import { UserLoaderService } from "../user-loader"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"

export interface OpenPositionParams {
    dexId: DexId
    poolId: LiquidityPoolId
    chainId: ChainId
    accountAddress: string
    amount: BN
    priorityAOverB?: boolean
    network?: Network
    userId: string 
}

export type WritePositionParams = OpenPositionParams

@Injectable()
export class PositionRecordManagerService implements OnModuleInit {
    private cacheManager: Cache
    private sqliteDataSource: DataSource
    private mongoDbConnection: Connection
    constructor(
        private readonly liquidityPoolService: LiquidityPoolService,
        private readonly pythService: PythService,
        private readonly dataLikeService: DataLikeService,
        private readonly cacheHelpersService: CacheHelpersService,
        private readonly userLoaderService: UserLoaderService,
        private readonly moduleRef: ModuleRef,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly logger: Logger,
    ) { }

    onModuleInit() {
        // get the proper cache manager
        this.cacheManager = this.cacheHelpersService.getCacheManager({ autoSelect: true })
        // get the proper data source
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

    /**
   * Open a new LP position on any supported DEX
   */
    private async openPosition({
        dexId,
        poolId,
        chainId,
        accountAddress,
        amount,
        priorityAOverB = true,
        network = Network.Mainnet,
        userId,
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        // init tokens + pyth
        this.pythService.initialize(this.dataLikeService.tokens)
        await this.pythService.preloadPrices()
        //find liquidity pools
        const liquidityPools = this.dataLikeService.liquidityPools
        const pool = liquidityPools.find((liquidityPool) => liquidityPool.displayId === poolId)
        if (!pool) throw new Error(`LiquidityPool ${poolId} not found`)
        // fetch live pool state
        const sertializedFetchedPools = await this.cacheManager.get<string>(
            createCacheKey(
                CacheKey.LiquidityPools,
                {
                    chainId,
                    network,
                }),
        )
        if (!sertializedFetchedPools) throw new Error("FetchedPools not found")
        const fetchedPools = this.superjson.parse<Array<FetchedPool>>(sertializedFetchedPools)
        const fetchedPool = fetchedPools.find((fetchedPool) => fetchedPool.displayId === pool.displayId)
        if (!fetchedPool) throw new Error(`FetchedPool ${pool.displayId} not found`)
        // load user
        const users = await this.userLoaderService.loadUsers()
        const user = users.find((user) => user.id === userId)
        if (!user) throw new Error(`User ${userId} not found`)
        const [{ action }] = await this.liquidityPoolService.getDexs({
            dexIds: [dexId],
            chainId
        })
        const tokenAId = pool.tokenAId
        const tokenBId = pool.tokenBId
        return await action.openPosition({
            accountAddress,
            priorityAOverB,
            pool: fetchedPool,
            amount,
            tokenAId,
            tokenBId,
            tokens: this.dataLikeService.tokens,
            user,
            chainId,
            network
        })
    }

    private async writeSqlitePosition(
        params: WritePositionParams,
    ) {
        await this.sqliteDataSource.transaction(
            async (manager) => {
                // we try open position first
                const { 
                    txHash, 
                    liquidity, 
                    depositAmount, 
                    tickLower, 
                    tickUpper, 
                    positionId
                } = await this.openPosition(params)
                await manager.insert(PositionEntity,
                    [
                        {
                            openTxHash: txHash,
                            amountOpen: depositAmount.toString(),
                            tickLower,
                            tickUpper,
                            liquidity: liquidity?.toString(),
                            positionId,
                        }
                    ])
                this.logger.info(WinstonLog.PositionWritten, {
                    positionId,
                    txHash,
                    depositAmount: depositAmount.toString(),
                })
            }
        )   
    }

    private async writeMongoDbPosition(
        params: WritePositionParams,
    ) {
        console.log("writeMongoDbPosition", params)
        throw new Error("Not implemented")
    }

    public async writePosition(
        params: WritePositionParams,
    ) {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            await this.writeMongoDbPosition(params)
            break
        }
        case LpBotType.System: {
            await this.writeSqlitePosition(params)
            break
        }
        }
    }
}

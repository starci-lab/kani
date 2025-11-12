import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Network } from "@modules/common"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { Connection, PublicKey } from "@solana/web3.js"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { PoolInfoLayout } from "@raydium-io/raydium-sdk-v2"
import { CacheKey, CacheService, createCacheKey } from "@modules/cache"
import { DynamicLiquidityPoolInfo } from "../../types"
import BN from "bn.js"
import { 
    DynamicLiquidityPoolInfoSchema, 
    InjectPrimaryMongoose, 
    LiquidityPoolId,
    PrimaryMemoryStorageService,
    DexId
} from "@modules/databases"
import { Connection as MongooseConnection } from "mongoose"
import { AsyncService } from "@modules/mixin"
import { createObjectId } from "@modules/common"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class RaydiumObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly cacheService: CacheService,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService
    ) { }   

    // we try to iterate through all the liquidity pools and observe them
    // do it when the application bootstraps
    onApplicationBootstrap() {
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Raydium).toString()) {
                continue
            }
            this.observeClmmPool(liquidityPool.displayId)
        }
    }

    // observe a clmm pool
    private async observeClmmPool(
        liquidityPoolId: LiquidityPoolId,
    ) {
        const liquidityPool = this.memoryStorageService
            .liquidityPools
            .find((liquidityPool) => liquidityPool.displayId === liquidityPoolId)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId)
        }
        // retrieve the corresponding connection for the network
        const connection = this.solanaClients[liquidityPool.network]
            .ws[RAYDIUM_CLIENTS_INDEX]
        // listen to the pool address
        connection.onAccountChange(
            new PublicKey(liquidityPool.poolAddress), async (accountInfo) => {
                const state = PoolInfoLayout.decode(accountInfo.data)
                await this.asyncService.allIgnoreError([
                    this.cacheService.set<DynamicLiquidityPoolInfo>({
                        key: createCacheKey(
                            CacheKey.DynamicLiquidityPoolInfo, 
                            liquidityPool.displayId
                        ),
                        value: {
                            tickCurrent: state.tickCurrent,
                            liquidity: new BN(state.liquidity),
                            sqrtPriceX64: new BN(state.sqrtPriceX64),
                        },
                    }),
                    this.connection.model(DynamicLiquidityPoolInfoSchema.name)
                        .create({
                            liquidityPool: createObjectId(liquidityPoolId),
                            tickCurrent: state.tickCurrent,
                            liquidity: new BN(state.liquidity),
                            sqrtPriceX64: new BN(state.sqrtPriceX64),
                        })
                ])
                this.winstonLogger.debug(
                    WinstonLog.ObserveClmmPool, 
                    {
                        liquidityPoolId,
                        tickCurrent: state.tickCurrent.toString(),
                        liquidity: new BN(state.liquidity).toString(),
                        sqrtPriceX64: new BN(state.sqrtPriceX64).toString(),
                    }
                )
            })
       
    }
}

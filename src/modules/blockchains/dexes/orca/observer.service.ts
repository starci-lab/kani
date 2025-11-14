import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Network } from "@typedefs"
import { createObjectId } from "@utils"
import { 
    DexId, 
    DynamicLiquidityPoolInfoSchema, 
    InjectPrimaryMongoose, 
    LiquidityPoolId, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { Connection, PublicKey } from "@solana/web3.js"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { ORCA_CLIENT_INDEX } from "./constants"
import { CacheKey, createCacheKey } from "@modules/cache"
import BN from "bn.js"
import { Logger as WinstonLogger } from "winston"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Connection as MongooseConnection } from "mongoose"
import { Whirlpool } from "./beets"
import { EventEmitterService, EventName } from "@modules/event"
import { InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"

@Injectable()
export class OrcaObserverService implements OnApplicationBootstrap {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly events: EventEmitterService,
    ) { }

    onApplicationBootstrap() {
        for (const liquidityPool of this.memoryStorageService.liquidityPools) {
            if (liquidityPool.dex.toString() !== createObjectId(DexId.Orca).toString()) {
                continue
            }
            this.observeClmmPool(liquidityPool.displayId)
        }
    }
    
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
            .ws[ORCA_CLIENT_INDEX]
        // listen to the pool address
        connection.onAccountChange(
            new PublicKey(liquidityPool.poolAddress), async (accountInfo) => {
                // we remove the first 8 bytes of the account data because they are the account discriminator
                const state = Whirlpool.struct.read(accountInfo.data, 8)
                await this.asyncService.allIgnoreError([
                    // cache the pool info
                    this.cacheManager.set(
                        createCacheKey(
                            CacheKey.DynamicLiquidityPoolInfo, 
                            liquidityPool.displayId
                        ),
                        this.superjson.stringify({
                            tickCurrent: state.tickCurrentIndex,
                            liquidity: new BN(state.liquidity),
                            sqrtPriceX64: new BN(state.sqrtPrice),
                        }),
                    ),
                    // store the pool info in the database
                    this.connection.model(DynamicLiquidityPoolInfoSchema.name)
                        .create({
                            liquidityPool: createObjectId(liquidityPoolId),
                            tickCurrent: state.tickCurrentIndex,
                            liquidity: new BN(state.liquidity),
                            sqrtPriceX64: new BN(state.sqrtPrice),
                        }),
                    // emit the event
                    this.events.emit(
                        EventName.LiquidityPoolsFetched, {
                            liquidityPoolId,
                            tickCurrent: state.tickCurrentIndex,
                            liquidity: new BN(state.liquidity),
                            sqrtPriceX64: new BN(state.sqrtPrice),
                        }, {
                            withoutLocal: true,
                        }),
                ])
                this.winstonLogger.debug(WinstonLog.ObserveClmmPool, JSON.stringify({
                    liquidityPoolId,
                    tickCurrent: state.tickCurrentIndex.toString(),
                    liquidity: new BN(state.liquidity).toString(),
                    sqrtPriceX64: new BN(state.sqrtPrice).toString(),
                }))
            }
        )
    }
}

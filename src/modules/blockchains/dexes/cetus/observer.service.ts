import {
    ErrorSuiObjectName, SuiObjectInvalidTypeException, SuiObjectNotFoundException 
} from "@modules/exceptions"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    PrimaryMemoryStorageService, DexId 
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AsyncService, 
    LokiJSService
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import {
    parseCetusPool, CetusPool, CetusSuiObjectPoolFields 
} from "./struct"
import BN from "bn.js"
import { 
    CacheKey, 
    DynamicClmmLiquidityPoolInfoCacheResult, 
    CacheService 
} from "@modules/cache"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    DayjsService 
} from "@modules/mixin"
import {
    EventEmitterService, 
    EventName
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    Collection 
} from "lokijs"

/**
 * Service responsible for observing Cetus pool state changes.
 * Periodically fetches pool information from on-chain and updates cache.
 *
 * @example
 * const service = new CetusObserverService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class CetusObserverService implements OnApplicationBootstrap, OnModuleInit {
    /** Snapshot collection to reduce computational complexity. */
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dayjsService: DayjsService,
        private readonly lokiJSService: LokiJSService,
    ) {}

    /**
     * Initializes the service by creating a snapshot collection of liquidity pools.
     */
    async onModuleInit(): Promise<void> {
        // fetch all Cetus liquidity pools from primary memory storage
        const liquidityPools = this.memoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Cetus).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        
        // create local collection snapshot for efficient processing
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "cetus-observer-liquidity-pools", 
            {
                indices: [
                    "poolAddress",
                    "displayId",
                    "id"
                ],
            }
        )
        
        // insert pools into snapshot collection
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    /**
     * Starts the pool state update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handlePoolStateUpdateInterval()
    }
    
    /**
     * Handles periodic pool state updates.
     * Fetches pool information for all pools in parallel.
     */
    @Interval(envConfig().dexes.cetus.interval.observer.fetch)
    private async handlePoolStateUpdateInterval(): Promise<void> {
        // process all pools in parallel
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            promises.push(
                (async () => {
                    await this.fetchPoolInfo(liquidityPool)
                })()
            )
        }
        
        // wait for all fetches to complete
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Fetches pool information from on-chain and updates cache.
     *
     * @param liquidityPool - The liquidity pool schema to fetch information for
     */
    private async fetchPoolInfo(liquidityPool: LiquidityPoolSchema): Promise<void> {
        try {
            // fetch pool object from on-chain
            const objectInfo = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.getObject({
                        id: liquidityPool.poolAddress,
                        options: {
                            showContent: true,
                        },
                    })
                },
            })
            
            // validate object exists
            if (objectInfo.error || !objectInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Cetus,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            
            // validate object type
            if (objectInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Pool,
                    id: liquidityPool.poolAddress,
                    dexId: DexId.Cetus,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            
            // parse pool fields and update state
            const fields = objectInfo.data.content.fields as unknown as CetusSuiObjectPoolFields
            const pool = parseCetusPool(fields)
            await this.handlePoolStateUpdate({
                liquidityPool,
                state: pool
            })
        } catch (error) {
            // log fetch errors
            this.winstonService.log(
                WinstonLog.LiquidityPoolFetchedError, 
                {
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
        }
    }

    /**
     * Handles pool state update by caching and emitting events.
     *
     * @param param - Parameters for handling pool state update
     * @param param.liquidityPool - Liquidity pool schema
     * @param param.state - Parsed pool state
     * @returns Cache result
     */
    private async handlePoolStateUpdate({ liquidityPool, state }: { liquidityPool: LiquidityPoolSchema, state: CetusPool }): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        // build cache result from parsed pool state
        const parsed: DynamicClmmLiquidityPoolInfoCacheResult = {
            tickCurrent: state.currentTickIndex,
            liquidity: new BN(state.liquidity),
            sqrtPriceX64: new BN(state.currentSqrtPrice),
            rewards: state.rewarderManager.rewarders.map((rewarder) => ({
                tokenAddress: `0x${rewarder.rewardCoin}`,
                emissionPerSecond: new BN(rewarder.emissionsPerSecond),
                growthGlobal: new BN(rewarder.growthGlobal),
            })),
            feeGrowthGlobalA: new BN(state.feeGrowthGlobalA),
            feeGrowthGlobalB: new BN(state.feeGrowthGlobalB),
            snapshotAt: this.dayjsService.now(),
            rewardLastUpdatedTimeMs: state.rewarderManager.lastUpdatedTime,
        }
        
        // cache result and emit event in parallel
        await this.asyncService.allIgnoreError([
            // store in cache
            this.cacheService.set({
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id],
                cacheResult: parsed,
            }),
            // emit event through event emitter
            this.eventEmitterService.emit({
                event: EventName.ClmmLiquidityPoolsSynced,
                payload: {
                    id: liquidityPool.id,
                    ...parsed,
                },
            })
        ])
        
        return parsed
    }
}
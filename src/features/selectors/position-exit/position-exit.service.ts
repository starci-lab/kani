import { 
    TickMathService
} from "@modules/blockchains"
import { 
    EventName,
    PythSuiPricesUpdatedEvent, 
} from "@modules/event"
import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { 
    DataLikeQueryService, 
    PositionRecordManagerService, 
} from "@features/fetchers"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { 
    InjectSuperJson, 
    AsyncService, 
    LockService
} from "@modules/mixin"
import SuperJSON from "superjson"
import { CacheHelpersService, CacheKey, createCacheKey,  } from "@modules/cache"
import { Cache } from "cache-manager"
import { UserLike } from "@modules/databases"
import { Decimal } from "decimal.js"

// a service to exit position
// we use fomular to exit position
@Injectable()
export class PositionExitService implements OnModuleInit {
    private readonly logger = new Logger(PositionExitService.name)
    private cacheManager: Cache
    constructor(
        private readonly tickMathService: TickMathService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly asyncService: AsyncService,
        private readonly positionRecordManagerService: PositionRecordManagerService,
        private readonly lockService: LockService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly cacheHelpersService: CacheHelpersService,  
    ) { }

    async onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    @OnEvent(EventName.PythSuiPricesUpdated)
    async handlePythSuiPricesUpdated(
        { network, tokenId, chainId }: PythSuiPricesUpdatedEvent
    ) 
    {      
        const lockKey = `position-exit-${chainId}-${network}-${tokenId}`
        await this.lockService.withLocks({
            acquiredKeys: [lockKey],
            blockedKeys: [lockKey],
            releaseKeys: [lockKey],
            callback: async () => {
                try {
                    const serializedUserIds = await this.cacheManager.get<string>(createCacheKey(CacheKey.UserIds))
                    if (!serializedUserIds) {
                        this.logger.debug("No user ids found")
                        return
                    }
                    const userIds = this.superjson.parse<Array<string>>(serializedUserIds)
                    const serializedUsers = await this.cacheManager.mget<string>(
                        userIds.map(userId => createCacheKey(CacheKey.User, userId))
                    )
                    if (!serializedUsers) {
                        this.logger.debug("No users found")
                        return
                    }
                    // filter out undefined users
                    const users = serializedUsers
                        .filter(serializedUser => serializedUser !== undefined)
                        .map(serializedUser => this.superjson.parse<UserLike>(serializedUser))

                    const promises: Array<Promise<void>> = []
                    for (const user of users) {
                        promises.push(
                            (async () => {
                                // exit position for each user
                                for (const position of user.activePositions) {
                                    const liquidityPool = this.dataLikeQueryService.getLiquidityPoolFromPosition(position)
                                    if (liquidityPool.chainId !== chainId) {
                                        this.logger.debug("Liquidity pool chain id does not match")
                                        return
                                    }
                                    const tokenA = liquidityPool.tokenA
                                    const tokenB = liquidityPool.tokenB
                                    if (!tokenA || !tokenB) {
                                        this.logger.debug("No tokenA or tokenB found")
                                        return
                                    }
                                    if ([tokenA.displayId, tokenB.displayId].includes(tokenId)) {
                                    // fetch prices
                                        const [priceA, priceB] = await this.cacheHelpersService.mget<number>({
                                            keys: [
                                                createCacheKey(CacheKey.PythTokenPrice, tokenA.displayId, network),
                                                createCacheKey(CacheKey.PythTokenPrice, tokenB.displayId, network),
                                            ],
                                            autoSelect: true
                                        })
                                        if (!priceA || !priceB) {
                                            this.logger.debug("No price found")
                                            return
                                        }
          
                                        const oraclePrice = new Decimal(priceA).div(new Decimal(priceB))
                                        const priceLower = this.tickMathService.tickIndexToPrice(position.tickLower, tokenA.decimals, tokenB.decimals)
                                        const priceUpper = this.tickMathService.tickIndexToPrice(position.tickUpper, tokenA.decimals, tokenB.decimals)
          
                                        const effectivePriceLower = priceLower.mul(new Decimal(1).plus(liquidityPool.fee))
                                        const effectivePriceUpper = priceUpper.mul(new Decimal(1).minus(liquidityPool.fee))
          
                                        this.winstonLogger.debug(
                                            WinstonLog.OracleLiquidityRangeValidation,
                                            {
                                                oraclePrice: oraclePrice.toString(),
                                                priceLower: priceLower.toString(),
                                                priceUpper: priceUpper.toString(),
                                                effectivePriceLower: effectivePriceLower.toString(),
                                                effectivePriceUpper: effectivePriceUpper.toString(),
                                                liquidityPoolId: liquidityPool.displayId,
                                            }
                                        )
          
                                        if (oraclePrice.gte(effectivePriceLower) && oraclePrice.lte(effectivePriceUpper)) {
                                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeWithin, {
                                                oraclePrice: oraclePrice.toString(),
                                                effectiveLower: effectivePriceLower.toString(),
                                                effectiveUpper: effectivePriceUpper.toString(),
                                            })
                                            return
                                        }
                                        const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
                                            liquidityPool,
                                            user,
                                            chainId,
                                            network
                                        })
          
                                        const mustExit = priorityAOverB ? oraclePrice.gt(effectivePriceUpper) : oraclePrice.lt(effectivePriceLower)
                                        if (mustExit) {
                                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeMustExit, {
                                                priorityAOverB,
                                                oraclePrice: oraclePrice.toString(),
                                                effectivePriceLower: effectivePriceLower.toString(),
                                                effectivePriceUpper: effectivePriceUpper.toString(),
                                            })
                                            this.positionRecordManagerService.closePosition({
                                                poolId: liquidityPool.displayId,
                                                user,
                                                chainId,
                                                network,
                                            })
                                            return
                                        }
          
                                        const priceDiff = effectivePriceUpper.minus(effectivePriceLower).div(2)
                                        const upperExitThreshold = effectivePriceUpper.plus(priceDiff)
                                        const lowerExitThreshold = effectivePriceLower.minus(priceDiff)
          
                                        const isExitConditionMet = priorityAOverB
                                            ? oraclePrice.lte(lowerExitThreshold)
                                            : oraclePrice.gte(upperExitThreshold)
          
                                        if (isExitConditionMet) {
                                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeExitConditionMet, {
                                                priorityAOverB,
                                                oraclePrice: oraclePrice.toString(),
                                                upperExitThreshold: upperExitThreshold.toString(),
                                                lowerExitThreshold: lowerExitThreshold.toString(),
                                            })
                                            this.positionRecordManagerService.closePosition({
                                                poolId: liquidityPool.displayId,
                                                user,
                                                chainId,
                                                network
                                            })
                                            return
                                        }
          
                                        this.winstonLogger.info(WinstonLog.OracleLiquidityRangeOutButNotExit, {
                                            oraclePrice: oraclePrice.toString(),
                                            upperExitThreshold: upperExitThreshold.toString(),
                                            lowerExitThreshold: lowerExitThreshold.toString(),
                                        })
                                    }
                                }
                            })()
                        )
                    }
                    await this.asyncService.allIgnoreError(promises)
                } catch (error) {
                    this.winstonLogger.error(WinstonLog.PositionExitError, {
                        error: error.message,
                        stack: error.stack,
                    })
                }
            }
        })
    }
}
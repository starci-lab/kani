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
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { TokenId, UserLike } from "@modules/databases"
import { Decimal } from "decimal.js"
import { ChainId, Network } from "@modules/common"
    
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
    ) {}
  
    async onModuleInit() {
        // Initialize cache manager (auto-select Redis/memory depending on config)
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }
  
    private createLockKey(chainId: ChainId, network: Network, userId: string, positionId: string) {
        return `position-exit-${chainId}-${network}-${userId}-${positionId}`
    }
  
    /**
     * Handler triggered whenever Pyth publishes a price update on Sui.
     * For each active user, checks whether their liquidity positions
     * need to be exited based on the updated oracle price.
     */
    @OnEvent(EventName.PythSuiPricesUpdated)
    async handlePythSuiPricesUpdated({ network, tokenId, chainId }: PythSuiPricesUpdatedEvent) {
        try {
        // 1. Load all active user IDs from cache
            const serializedUserIds = await this.cacheManager.get<string>(createCacheKey(CacheKey.UserIds))
            if (!serializedUserIds) {
                this.logger.debug("No user ids found")
                return
            }
  
            // 2. Load user objects from cache
            const userIds = this.superjson.parse<Array<string>>(serializedUserIds)
            const serializedUsers = await this.cacheManager.mget<string>(
                userIds.map(userId => createCacheKey(CacheKey.User, userId))
            )
            if (!serializedUsers) {
                this.logger.debug("No users found")
                return
            }
  
            // 3. Parse only valid users
            const users = serializedUsers
                .filter(serializedUser => serializedUser !== undefined)
                .map(serializedUser => this.superjson.parse<UserLike>(serializedUser))
  
            // 4. Process each user concurrently (safe because of per-user lock)
            const promises: Array<Promise<void>> = users.map(user => 
                this.processUser(user, chainId, network, tokenId)
            )
            await this.asyncService.allIgnoreError(promises)
  
        } catch (error) {
            this.winstonLogger.error(WinstonLog.PositionExitError, {
                error: error.message,
                stack: error.stack,
            })
        }
    }
  
    /**
     * Process all positions of a single user.
     * Uses per-user lock to prevent concurrent exit attempts.
     */
    private async processUser(
        user: UserLike, 
        chainId: ChainId, 
        network: Network, 
        tokenId: TokenId
    ) {
        if (!user.id) {
            this.logger.debug("User id is undefined")
            return
        }
        for (const position of user.activePositions) {
            const liquidityPool = this.dataLikeQueryService.getLiquidityPoolFromPosition(position)
            if (liquidityPool.chainId !== chainId) {
                this.logger.debug("Liquidity pool chain id does not match")
                continue
            }
            const tokenA = liquidityPool.tokenA
            const tokenB = liquidityPool.tokenB
            if (!tokenA || !tokenB) {
                this.logger.debug("No tokenA or tokenB found")
                continue
            }
            // Only act if the updated token matches one of the pool tokens
            if (![tokenA.displayId, tokenB.displayId].includes(tokenId)) {
                this.logger.debug("Token does not match one of the pool tokens")
                continue
            }
            if (!position.id) {
                throw new Error("Position id is undefined")
            }
            const lockKey = this.createLockKey(chainId, network, user.id, position.id)
            await this.lockService.withLocks({
                acquiredKeys: [lockKey],
                blockedKeys: [lockKey],
                releaseKeys: [lockKey],
                groupName: `Exit:${user.id}`,
                callback: async () => {
                    try {
                        // --- Price fetching ---
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
                        // --- Oracle price calculation ---
                        const oraclePrice = new Decimal(priceA).div(new Decimal(priceB))
                        const priceLower = this.tickMathService.tickIndexToPrice(position.tickLower, tokenA.decimals, tokenB.decimals)
                        const priceUpper = this.tickMathService.tickIndexToPrice(position.tickUpper, tokenA.decimals, tokenB.decimals)
      
                        this.winstonLogger.debug(WinstonLog.OracleLiquidityRangeValidation, {
                            oraclePrice: oraclePrice.toString(),
                            priceLower: priceLower.toString(),
                            priceUpper: priceUpper.toString(),
                            liquidityPoolId: liquidityPool.displayId,
                        })
      
                        // --- Case 1: price within user’s range ---
                        if (oraclePrice.gte(priceLower) && oraclePrice.lte(priceUpper)) {
                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeWithin, {
                                oraclePrice: oraclePrice.toString(),
                                priceLower: priceLower.toString(),
                                priceUpper: priceUpper.toString(),
                            })
                            return
                        }
      
                        // --- Case 2: price outside range on non-priority side ---
                        const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
                            liquidityPool,
                            user,
                            chainId,
                            network
                        })
                        const mustExitSinceAtNonPriority = priorityAOverB
                            ? oraclePrice.gt(priceUpper)
                            : oraclePrice.lt(priceLower)
      
                        if (mustExitSinceAtNonPriority) {
                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeExitNonPriority, {
                                priorityAOverB,
                                oraclePrice: oraclePrice.toString(),
                                priceLower: priceLower.toString(),
                                priceUpper: priceUpper.toString(),
                            })
                            await this.positionRecordManagerService.closePosition({
                                poolId: liquidityPool.displayId,
                                user,
                                chainId,
                                network,
                            })
                            return
                        }
      
                        // --- Case 3: price far beyond thresholds on priority side ---
                        const priceDiff = priceUpper.minus(priceLower).div(2)
                        const upperExitThreshold = priceUpper.plus(priceDiff)
                        const lowerExitThreshold = priceLower.minus(priceDiff)
      
                        const mustExitSinceAtPriority = priorityAOverB
                            ? oraclePrice.lte(lowerExitThreshold)
                            : oraclePrice.gte(upperExitThreshold)
      
                        if (mustExitSinceAtPriority) {
                            this.winstonLogger.info(WinstonLog.OracleLiquidityRangeExitPriority, {
                                priorityAOverB,
                                oraclePrice: oraclePrice.toString(),
                                upperExitThreshold: upperExitThreshold.toString(),
                                lowerExitThreshold: lowerExitThreshold.toString(),
                            })
                            await this.positionRecordManagerService.closePosition({
                                poolId: liquidityPool.displayId,
                                user,
                                chainId,
                                network,
                            })
                            return
                        }
                        // --- Case 4: outside range, but still within “acceptable” buffer ---
                        this.winstonLogger.info(WinstonLog.OracleLiquidityRangeAcceptableOut, {
                            oraclePrice: oraclePrice.toString(),
                            upperExitThreshold: upperExitThreshold.toString(),
                            lowerExitThreshold: lowerExitThreshold.toString(),
                        })
                    } catch (error) {
                        this.winstonLogger.error(WinstonLog.PositionExitError, {
                            error: error.message,
                            stack: error.stack,
                        })
                    } finally {
                        this.winstonLogger.debug(WinstonLog.PositionExitEnd, {
                            positionId: position.id,
                            chainId,
                            network,
                            userId: user.id,
                        })
                    }
                }  
            })
        }
    }
}
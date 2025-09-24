import { 
    FetchedPool, 
    TickManagerService
} from "@modules/blockchains"
import { 
    EventName, 
    LiquidityPoolsFetchedEvent 
} from "@modules/event"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { 
    DataLikeQueryService, 
    PositionRecordManagerService, 
    UserLoaderService
} from "@features/fetchers"
import { DexId, UserLike } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { 
    InjectSuperJson, 
    AsyncService, 
    DayjsService,
    LockService
} from "@modules/mixin"
import SuperJSON from "superjson"

@Injectable()
export class PoolSelectorService {
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly userLoaderService: UserLoaderService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly asyncService: AsyncService,
        private readonly positionRecordManagerService: PositionRecordManagerService,
        private readonly lockService: LockService,
    ) { }


    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        const promises: Array<Promise<void>> = []
        // Load all users to ensure we are using new set of users
        // We load all users to reduce the number of database queries
        const users = await this.userLoaderService.loadUsers(true)
        for (const user of users) {
            promises.push(
                (async () => {
                    const lockKey = `pool-selector-${user.id}-${event.chainId}-${event.network}`
                    await this.lockService.withLocks({
                        blockedKeys: [lockKey],
                        acquiredKeys: [lockKey],
                        releaseKeys: [lockKey],
                        callback: async () => {
                            // Check if the user has already opened a position
                            const { alreadyOpened, liquidityPoolId } =
                            this.checkAlreadyOpened(user, event.chainId, event.network)
                            // If the user has already opened a position, skip
                            if (alreadyOpened) {
                                this.winstonLogger.debug(
                                    WinstonLog.PoolAlreadyOpened,
                                    {
                                        userId: user.id,
                                        chainId: event.chainId,
                                        network: event.network,
                                        liquidityPoolId,
                                    }
                                )
                                return
                            }

                            // Try to open pools for each user using event data
                            await this.tryOpenPool({
                                user,
                                fetchedPools: this.superjson.parse(event.pools),
                                chainId: event.chainId,
                                network: event.network,
                            })
                        },
                    })
                })()
            )
        }
        // Wait for all open attempts to finish, ignoring errors
        await this.asyncService.allIgnoreError(promises)
    }

    private checkAlreadyOpened(
        user: UserLike,
        chainId: ChainId,
        network: Network,
    ): CheckAlreadyOpenedResponse {
        const chainConfig = this.dataLikeQueryService.getChainConfig(user, chainId, network)
        return {
            alreadyOpened: !!(chainConfig?.providedAssignedLiquidityPoolId),
            liquidityPoolId: chainConfig?.providedAssignedLiquidityPoolId,
        }
    }

    private async getOpenablePools(
        {
            user,
            pools,
            chainId,
            network
        }: GetOpenablePoolsParams
    ) {
        const openPositionablePools: Array<FetchedPool> = []
        // Filter pools matching user's farm token type
        const fetchingPools = this
            .dataLikeQueryService
            .getPoolsMatchingUserFarmType(user, pools, chainId, network)
            // this is a temporary to ensure opening position on Turbos pools
            //.filter((pool) => pool.liquidityPool.dexId === DexId.Turbos)  
            .filter((pool) => pool.liquidityPool.dexId === DexId.Momentum)  
        // Iterate over the matching pools
        for (const pool of fetchingPools) {
            // Here you could add additional filtering logic if needed
            openPositionablePools.push(pool)
        }
        return openPositionablePools
    }

    private async tryOpenPool(
        {
            network,
            user,
            chainId,
            fetchedPools
        }: TryOpenPoolParams
    ) {
        // Get list of pools that can potentially be opened
        const openablePools = await this.getOpenablePools({
            user,
            pools: fetchedPools,
            chainId,
            network,
        })
        if (!openablePools.length) {
            // Log if no pools are openable for the user
            this.winstonLogger.debug(
                WinstonLog.NoOpenablePools, {
                    userId: user.id,
                    chainId,
                    network,
                    timestamp: this.dayjsService.now().unix(),
                })
            return
        }
        // Attempt to open the first eligible pool from the filtered list
        await this.openFirstEligiblePool({
            user,
            fetchedPools: openablePools,
            chainId,
            network,
        })
    }

    private async openFirstEligiblePool(
        { 
            user, 
            fetchedPools, 
            chainId, 
            network
        }: OpenFirstEligiblePoolParams
    ) {
        // Iterate over the candidate pools
        for (const pool of fetchedPools) {
            // Determine priority between pools (custom business logic)
            const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
                liquidityPool: pool.liquidityPool,
                user,
                network,
                chainId,
            })
            // Check if the pool can be opened given the priority
            const {
                canOpenPosition,
                tickDistance, 
                tickMaxDeviation,
            } = this.tickManagerService.canOpenPosition(pool, priorityAOverB)
            if (canOpenPosition) {
                // Open position on the pool
                await this.positionRecordManagerService.openPosition({
                    user,
                    poolId: pool.liquidityPool.displayId,
                    chainId,
                    network,
                })
                // Log success event
                this.winstonLogger.info(
                    WinstonLog.PoolOpened,
                    {
                        userId: user.id,
                        liquidityPoolId: pool.liquidityPool.displayId,
                        chainId,
                        network,
                        tickDistance,
                        tickMaxDeviation,
                        timestamp: this.dayjsService.now().unix(),
                    }
                )
                // cache the user
                // to let other services to use the latest user
                if (!user.id) {
                    throw new Error("User ID is required")
                }
                // sync the user
                await this.userLoaderService.cacheUser(user.id)
                // Stop after successfully opening the first eligible pool
                break
            } else {
                // Log that this pool was not openable
                this.winstonLogger.warn(
                    WinstonLog.PoolNotOpenable,
                    {
                        userId: user.id,
                        liquidityPoolId: pool.liquidityPool.displayId,
                        chainId,
                        network,
                        tickDistance,
                        tickMaxDeviation,
                        timestamp: this.dayjsService.now().unix(),
                    }
                )
            }
        }
    }
}

export interface GetOpenablePoolsParams {
    user: UserLike
    pools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}

export interface TryOpenPoolParams {
    user: UserLike
    fetchedPools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}

export interface OpenFirstEligiblePoolParams {
    user: UserLike
    fetchedPools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}

export interface CheckAlreadyOpenedResponse {
    alreadyOpened: boolean
    liquidityPoolId?: string
}
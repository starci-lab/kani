import { FetchedPool } from "@modules/blockchains"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { TickManagerService } from "./tick-manager.service"
import { DataLikeQueryService, UserLoaderService } from "@features/fetchers"
import { UserLike } from "@modules/databases"
import { ChainId, Network, PlatformId } from "@modules/common"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"

@Injectable()
export class PoolSelectorService {
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly userLoaderService: UserLoaderService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: Logger
    ) { }

    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        const promises: Array<Promise<void>> = []
        for (const user of this.userLoaderService.users) {
            for (const platformId of Object.values(PlatformId)) {
                promises.push((async () => {
                    await this.tryOpenPool({
                        user,
                        pools: this.superjson.parse(event.pools),
                        platformId,
                        chainId: event.chainId,
                        network: event.network,
                    })
                })())
            }
        }
        await Promise.all(promises)
    }

    private async getOpenablePools(
        {
            user,
            pools,
            platformId,
            chainId,
            network
        }: GetOpenablePoolsParams
    ) {
        const openPositionablePools: Array<FetchedPool> = []
        const fetchingPools = this
            .dataLikeQueryService
            .getPoolsMatchingUserFarmType(user, pools, platformId, chainId)
        for (const pool of fetchingPools) { 
            const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
                pool,
                user,
                platformId,
                chainId,
                network,
            })
            console.log(`pool: ${pool.liquidityPool.poolAddress}, priorityAOverB: ${priorityAOverB}`)
            const canOpenPosition = this.tickManagerService.canOpenPosition(pool, priorityAOverB)
            if (canOpenPosition) {
                openPositionablePools.push(pool)
            }
        }
        // write a log
        this.winstonLogger.info(
            "OpenPositionablePools", 
            {
                userId: user.id,
                chainId,
                network,
                pools: openPositionablePools.map((pool) => pool.liquidityPool.id),
            })
        return openPositionablePools
    }

    private async tryOpenPool(
        params: TryOpenPoolParams
    ) {
        // const {
        //     pool,
        //     user,
        //     walletType,
        //     chainId,
        //     network,
        // } = params
        await this.getOpenablePools(params)
        // we pick a random pool from the openable pools
        // const randomPool = openablePools[Math.floor(Math.random() * openablePools.length)]
    }
}

export interface GetOpenablePoolsParams {
    user: UserLike
    platformId: PlatformId
    pools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}

export interface TryOpenPoolParams {
    user: UserLike
        platformId: PlatformId
    pools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}
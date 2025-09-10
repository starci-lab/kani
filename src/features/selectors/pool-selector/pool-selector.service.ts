import { FetchedPool } from "@modules/blockchains"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { TickManagerService } from "./tick-manager.service"
import { DataLikeQueryService, UserLoaderService } from "@features/fetchers"
import { UserLike, WalletType } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"

@Injectable()
export class PoolSelectorService {
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly userLoaderService: UserLoaderService,
        @InjectWinston()
        private readonly winstonLogger: Logger
    ) { }

    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        const promises: Array<Promise<void>> = []
        for (const user of this.userLoaderService.users) {
            for (const walletType of Object.values(WalletType)) {
                promises.push((async () => {
                    await this.tryOpenPool({
                        user,
                        pools: event.pools,
                        walletType,
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
            walletType,
            chainId,
            network
        }: GetOpenablePoolsParams
    ) {
        const openPositionablePools: Array<FetchedPool> = []
        const fetchingPools = this
            .dataLikeQueryService
            .getPoolsMatchingUserFarmType(user, pools, walletType)
        for (const pool of fetchingPools) { 
            const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
                pool,
                user,
                walletType,
                chainId,
                network,
            })
            const canOpenPosition = this.tickManagerService.canOpenPosition(pool, priorityAOverB)
            if (canOpenPosition) {
                openPositionablePools.push(pool)
            }
        }
        // write a log
        this.winstonLogger.info("OpenPositionablePools", {
            userId: user.id,
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
    walletType: WalletType
    pools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}

export interface TryOpenPoolParams {
    user: UserLike
    walletType: WalletType
    pools: Array<FetchedPool>
    chainId: ChainId
    network: Network
}
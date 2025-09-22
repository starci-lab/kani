import { DataLikeService, PoolFetcherService, PositionRecordManagerService, UserLoaderService } from "@features/fetchers"
import { PythService } from "@modules/blockchains"
import { ChainId, waitUntil } from "@modules/common"
import { DexId, LiquidityPoolId } from "@modules/databases"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import BN from "bn.js"

@Injectable()
export class TestPositionService implements OnApplicationBootstrap {
    constructor(
        private readonly positionRecordManagerService: PositionRecordManagerService,
        private readonly userLoaderService: UserLoaderService,
        private readonly pythService: PythService,
        private readonly dataLikeService: DataLikeService,
        private readonly poolFetcherService: PoolFetcherService,
    ) {}

    async onApplicationBootstrap() {
        waitUntil(() => this.dataLikeService.loaded)
        this.pythService.initialize(this.dataLikeService.tokens)
        await this.pythService.preloadPrices()
        const users = await this.userLoaderService.loadUsers()
        await this.poolFetcherService.fetchPools()
        // await this.positionRecordManagerService.openPosition({
        //     dexId: DexId.Turbos,
        //     chainId: ChainId.Sui,
        //     poolId: LiquidityPoolId.TurbosIkaUsdc015,
        //     amount: new BN(1_000_000), // 1u
        //     user: users[0],
        //     requireZapEligible: false,
        // })
        await this.positionRecordManagerService.closePosition({
            dexId: DexId.Turbos,
            chainId: ChainId.Sui,
            poolId: LiquidityPoolId.TurbosIkaUsdc015,
            user: users[0],
        })
        // await this.positionRecordManagerService.closePosition({
        //     dexId: DexId.Turbos,
        //     chainId: ChainId.Sui,
        //     poolId: LiquidityPoolId.TurbosIkaUsdc015,
        //     user: users[0],
        // })
    }
}
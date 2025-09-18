import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    PythService,
} from "@modules/blockchains"
import { ChainId, waitUntil } from "@modules/common"
import { DataLikeService, PoolFetcherService } from "@features/fetchers"
import { PositionRecordManagerService } from "@features/fetchers"
import { DexId, LiquidityPoolId } from "@modules/databases"
import BN from "bn.js"

@Injectable()
export class MmtTestLiquidityManangementService implements OnApplicationBootstrap
{
    constructor(
    private readonly pythService: PythService,
    private readonly dataLikeService: DataLikeService,
    private readonly positionRecordManagerService: PositionRecordManagerService,
    private readonly poolFetcherService: PoolFetcherService,
    ) {}

    async onApplicationBootstrap() {
        await waitUntil(() => this.dataLikeService.loaded)
        this.pythService.initialize(this.dataLikeService.tokens)
        //await this.pythService.preloadPrices()
        await this.poolFetcherService.fetchPools()
        await this.positionRecordManagerService.writePosition({
            dexId: DexId.Cetus,
            poolId: LiquidityPoolId.TurbosIkaUsdcIka015,
            chainId: ChainId.Sui,
            accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            amount: new BN("1000000"), // 1 u
            priorityAOverB: false,
            userId: "56a1ba22-92d2-4292-a38b-8ffae29ad508",
        })
    }
}

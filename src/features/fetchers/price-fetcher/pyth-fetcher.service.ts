import { PythService } from "@modules/blockchains"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { DataLikeService } from "../data-like"
import { waitUntil } from "@modules/common"
import { InitializerService } from "@modules/initializer"

@Injectable()
export class PythFetcherService implements OnApplicationBootstrap {
    constructor(
        private readonly dataLikeService: DataLikeService,
        private readonly pythService: PythService,
        private readonly initializeSerivce: InitializerService,
    ) {}

    async onApplicationBootstrap() {
        await waitUntil(() => this.dataLikeService.loaded)
        // initialize pyth services
        this.pythService.initialize(this.dataLikeService.tokens)
        // preload prices
        await this.pythService.preloadPrices()
        // load the services
        this.initializeSerivce.loadService(
            PythFetcherService.name
        )
    }
}
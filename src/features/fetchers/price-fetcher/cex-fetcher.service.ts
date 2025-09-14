import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    BinanceProcessorService,
    GateProcessorService,
} from "@modules/blockchains"
// import { CacheHelpersService } from "@modules/cache"
// import { InjectWinston } from "@modules/winston"
// import { Logger } from "winston"
// import { EventEmitterService } from "@modules/event"
// import { Cache } from "cache-manager"
import { DataLikeService } from "../data-like"
import { CexId } from "@modules/databases"
import { waitUntil } from "@modules/common"
import { InitializerService } from "@modules/initializer"
// import { CoinMarketCapService, CoinGeckoService } from "@modules/blockchains"

@Injectable()
export class CexFetcherService implements OnApplicationBootstrap {
    constructor(
    private readonly dataLikeService: DataLikeService,
    private readonly binanceProcessorService: BinanceProcessorService,
    private readonly gateProcessorService: GateProcessorService,
    private readonly initializeSerivce: InitializerService,
    // private readonly cacheHelpersService: CacheHelpersService,
    // private readonly coinMarketCapService: CoinMarketCapService,
    // private readonly coinGeckoService: CoinGeckoService,
    // @InjectWinston()
    // private readonly logger: Logger,
    // private readonly eventEmitterService: EventEmitterService,
    ) { }

    async onApplicationBootstrap() {
        await waitUntil(() => {
            return this.dataLikeService.loaded
        })
        const tokens = this.dataLikeService.tokens
        // fetch all tokens listed in Binance
        const binanceTokens = tokens.filter(
            (token) => token.whichCex === CexId.Binance,
        )
        this.binanceProcessorService.initialize(
            binanceTokens.map((token) => token.displayId),
            binanceTokens,
        )
        // fetch all tokens listed in Gate
        const gateTokens = tokens.filter((token) => token.whichCex === CexId.Gate)
        this.gateProcessorService.initialize(
            gateTokens.map((token) => token.displayId),
            gateTokens,
        )
        await Promise.all([
            this.binanceProcessorService.fetchRestSnapshot,
            this.gateProcessorService.fetchRestSnapshot,  
        ])
        this.initializeSerivce.loadService(
            CexFetcherService.name
        )
    }

    // @Cron("*/3 * * * * *")
    // async fetchCoinMarketCapPrices() {
    //     const prices = await this.coinMarketCapService.getPricesBySymbol(
    //         this.memdbService.tokens.map((token) => token.coinMarketCapId),
    //     )
    //     await this.cacheManager.set(
    //         createCacheKey(CacheKey.CoinMarketCapPrices),
    //         prices,
    //     )
    //     this.logger.info("CoinMarketCapPricesFetched", {
    //         prices,
    //     })
    //     this.eventEmitterService.emit(EventName.CoinMarketCapPricesFetched, prices)
    // }

    // @Cron("*/3 * * * * *")
    // async fetchCoinGeckoPrices() {
    //     const prices = await this.coinGeckoService.getPrices(
    //         this.memdbService.tokens.map((token) => token.coinGeckoId),
    //     )
    //     await this.cacheManager.set(
    //         createCacheKey(CacheKey.CoinGeckoPrices),
    //         prices,
    //     )
    //     this.logger.info("CoinGeckoPricesFetched", {
    //         prices,
    //     })
    //     this.eventEmitterService.emit(EventName.CoinMarketCapPricesFetched, prices)
    // }
}

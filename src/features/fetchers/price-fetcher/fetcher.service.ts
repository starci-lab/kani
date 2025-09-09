import { Injectable } from "@nestjs/common"
import { CoinMarketCapService, CoinGeckoService } from "@modules/blockchains"
import { Cron } from "@nestjs/schedule"
import { MemDbService } from "@modules/databases"
import { CacheKey, CacheHelpersService } from "@modules/cache"
import { createCacheKey } from "@modules/cache"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"
import { Cache } from "cache-manager"

@Injectable()
export class FetcherService {
    private readonly cacheManager: Cache
    constructor(
        private readonly coinMarketCapService: CoinMarketCapService,
        private readonly coinGeckoService: CoinGeckoService,
        private readonly memdbService: MemDbService,
        private readonly cacheHelpersService: CacheHelpersService,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly eventEmitterService: EventEmitterService
    ) {
        this.cacheManager = this.cacheHelpersService.getCacheManager({ autoSelect: true })
    }


    @Cron("*/3 * * * * *")
    async fetchCoinMarketCapPrices() {
        const prices = await this.coinMarketCapService.getPricesBySymbol(
            this.memdbService.tokens.map((token) => token.coinMarketCapId),
        )
        await this.cacheManager.set(
            createCacheKey(CacheKey.CoinMarketCapPrices),
            prices,
        )
        this.logger.info("CoinMarketCapPricesFetched", {
            prices,
        })
        this.eventEmitterService.emit(EventName.CoinMarketCapPricesFetched, prices)
    }

    @Cron("*/3 * * * * *")
    async fetchCoinGeckoPrices() {
        const prices = await this.coinGeckoService.getPrices(
            this.memdbService.tokens.map((token) => token.coinGeckoId),
        )
        await this.cacheManager.set(
            createCacheKey(CacheKey.CoinGeckoPrices),
            prices,
        )
        this.logger.info("CoinGeckoPricesFetched", {
            prices,
        })
        this.eventEmitterService.emit(EventName.CoinMarketCapPricesFetched, prices)
    }
}

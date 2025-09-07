import { Injectable } from "@nestjs/common"
import { CoinMarketCapService, CoinGeckoService } from "@modules/blockchains"
import { Cron } from "@nestjs/schedule"
import { MemDbService } from "@modules/databases"
import { CacheKeys, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { createCacheKey } from "@modules/cache"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { EventEmitterService, EventName } from "@modules/event"

@Injectable()
export class FetcherService {
    constructor(
        private readonly coinMarketCapService: CoinMarketCapService,
        private readonly coinGeckoService: CoinGeckoService,
        private readonly memdbService: MemDbService,
        @InjectRedisCache()
        private readonly redisCacheManager: Cache,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly eventEmitterService: EventEmitterService
    ) { }

    @Cron("*/3 * * * * *")
    async fetchCoinMarketCapPrices() {
        const prices = await this.coinMarketCapService.getPricesBySymbol(
            this.memdbService.tokens.map((token) => token.coinMarketCapId),
        )
        await this.redisCacheManager.set(
            createCacheKey(CacheKeys.CoinMarketCapPrices),
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
        await this.redisCacheManager.set(
            createCacheKey(CacheKeys.CoinGeckoPrices),
            prices,
        )
        this.logger.info("CoinGeckoPricesFetched", {
            prices,
        })
        this.eventEmitterService.emit(EventName.CoinMarketCapPricesFetched, prices)
    }
}

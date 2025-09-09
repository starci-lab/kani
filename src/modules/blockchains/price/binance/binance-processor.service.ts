import {
    Injectable,
    OnModuleDestroy,
    Logger as NestLogger,
} from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { BinanceRestService } from "./binance-rest.service"
import { BinanceWsService, WsTicker, WsOrderBook } from "./binance-ws.service"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"

@Injectable()
export class BinanceProcessorService implements OnModuleDestroy {
    private symbols: Array<string> = []
    private readonly cacheManager: Cache

    // NestJS built-in logger (internal debug)
    private readonly logger = new NestLogger(BinanceProcessorService.name)

    constructor(
    private readonly rest: BinanceRestService,
    private readonly ws: BinanceWsService,
    private readonly cacheHelpersService: CacheHelpersService,
    // Winston logger (structured logs → Loki/ELK/etc.)
    @InjectWinston()
    private readonly winston: Logger,
    ) {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    /**
   * Initialize processor with a list of trading symbols
   * - Subscribes to WebSocket streams (ticker + order book)
   * - Stores symbols for periodic REST polling
   */
    initialize(symbols: string[]) {
        this.symbols = symbols

        for (const symbol of symbols) {
            this.subscribeTicker(symbol)
            // uncomment if you want to subscribe orderbook
            // this.subscribeOrderBook(symbol)
        }

        this.logger.log(
            `Initialized BinanceProcessorService for: ${symbols.join(", ")}`,
        )
    }

    /**
   * Subscribe to ticker stream and cache prices
   */
    private subscribeTicker(symbol: string) {
        this.ws.subscribeTicker(symbol, async (data: WsTicker) => {
            const lastPrice = parseFloat(data.c)

            this.winston.debug("Binance.WS.Ticker", {
                symbol,
                last: lastPrice,
            })

            await this.cacheManager.set(
                createCacheKey(CacheKey.TokenPriceData, symbol),
                { price: lastPrice },
            )
        })
    }

    /**
   * Subscribe to order book stream and cache snapshots
   */
    private subscribeOrderBook(symbol: string) {
        this.ws.subscribeOrderBook(symbol, 20, 1000, async (data: WsOrderBook) => {
            this.winston.debug("Binance.WS.OrderBook", {
                symbol,
                askLength: data.asks.length,
                bidLength: data.bids.length,
            })

            await this.cacheManager.set(
                createCacheKey(CacheKey.BinanceWsOrderBook, symbol),
                data,
            )
        })
    }

  /**
   * Periodically fetch snapshot via REST
   * - Runs every 3 seconds
   * - Provides redundancy in case WS connection drops
   */
  @Cron("*/3 * * * * *")
    async fetchRestSnapshot() {
        if (this.symbols.length === 0) return
        try {
            const prices = await this.rest.getPrices(this.symbols)

            if (typeof this.cacheManager.mset === "function") {
                await this.cacheManager.mset(
                    prices.map((price) => ({
                        key: createCacheKey(CacheKey.TokenPriceData, price.symbol),
                        value: { price: price.price },
                    })),
                )
            } else {
                for (const price of prices) {
                    await this.cacheManager.set(
                        createCacheKey(CacheKey.TokenPriceData, price.symbol),
                        { price: price.price },
                    )
                }
            }
            this.winston.debug("Binance.REST.Snapshot", { prices })
        } catch (err) {
            this.winston.error("Binance.REST.Error", {
                symbols: this.symbols,
                error: err.message,
            })
        }
    }

  /**
   * Cleanup WebSocket connections on module shutdown
   */
  onModuleDestroy() {
      this.ws.onModuleDestroy()
  }
}

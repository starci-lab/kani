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
import { CexId, TokenId, TokenLike } from "@modules/databases"
import { EventEmitterService, EventName } from "@modules/event"

@Injectable()
export class BinanceProcessorService implements OnModuleDestroy {
    private tokens: Array<TokenLike> = []
    private symbols: Array<string> = []
    private readonly cacheManager: Cache

    // NestJS built-in logger (internal debug)
    private readonly logger = new NestLogger(BinanceProcessorService.name)

    constructor(
        private readonly rest: BinanceRestService,
        private readonly ws: BinanceWsService,
        private readonly cacheHelpersService: CacheHelpersService,
        private readonly eventEmitterService: EventEmitterService,
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
    initialize(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>
    ) {
        this.tokens = tokens
        this.symbols = tokens.map((token) => token.cexSymbols[CexId.Binance]).filter(
            (symbol) => symbol !== undefined
        )
        for (const tokenId of tokenIds) {
            const token = tokens.find((token) => token.displayId === tokenId)
            if (!token) {
                this.logger.error(`Token ${tokenId} not found`)
                continue
            }
            if (!token.cexSymbols[CexId.Binance]) {
                this.logger.error(`Token ${tokenId} has no binance symbol`)
                continue
            }
            this.subscribeTicker(token.displayId)
            // uncomment if you want to subscribe orderbook
            // this.subscribeOrderBook(symbol)
        }

        this.logger.log(
            `Initialized BinanceProcessorService for: ${tokenIds.join(", ")}`,
        )
    }

    /**
   * Subscribe to ticker stream and cache prices
   */
    private subscribeTicker(tokenId: TokenId) {
        const token = this.tokens.find((token) => token.displayId === tokenId)
        if (!token) {
            this.logger.error(`Token ${tokenId} not found`)
            return
        }
        if (!token.cexSymbols[CexId.Binance]) {
            this.logger.error(`Token ${tokenId} has no binance symbol`)
            return
        }
        this.ws.subscribeTicker(token.cexSymbols[CexId.Binance], async (data: WsTicker) => {
            const lastPrice = parseFloat(data.c)

            this.winston.debug("Binance.WS.Ticker", {
                id: token.displayId,
                last: lastPrice,
            })

            await this.cacheManager.set(
                createCacheKey(CacheKey.TokenPriceData, token.displayId),
                { price: lastPrice },
            )
            this.eventEmitterService.emit(
                EventName.PricesUpdated, 
                [
                    {
                        tokenId: token.displayId,
                        price: lastPrice,
                    }
                ])
        })
    }

    /**
   * Subscribe to order book stream and cache snapshots
   */
    private subscribeOrderBook(tokenId: TokenId) {
        const token = this.tokens.find((token) => token.displayId === tokenId)
        if (!token) {
            this.logger.error(`Token ${tokenId} not found`)
            return
        }
        if (!token.cexSymbols[CexId.Binance]) {
            this.logger.error(`Token ${tokenId} has no binance symbol`)
            return
        }
        this.ws.subscribeOrderBook(token.symbol, 20, 1000, async (data: WsOrderBook) => {
            this.winston.debug("Binance.WS.OrderBook", {
                id: token.displayId,
                askLength: data.asks.length,
                bidLength: data.bids.length,
            })

            await this.cacheManager.set(
                createCacheKey(CacheKey.BinanceWsOrderBook, token.symbol),
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
        if (this.tokens.length === 0) return
        try {
            const prices = await this.rest.getPrices(this.symbols as Array<string>)

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
            this.eventEmitterService.emit(
                EventName.PricesUpdated,
                prices.map(price => (
                    {
                        tokenId: price.symbol,
                        price: price.price,
                    }
                ))
            )
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

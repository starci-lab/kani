import {
    Injectable,
    OnModuleDestroy,
    Logger as NestLogger,
} from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { BybitRestService } from "./bybit-rest.service"
import { BybitWsService, BybitWsTicker } from "./bybit-ws.service"
import { Logger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { CexId, TokenId, TokenSchema } from "@modules/databases"

@Injectable()
export class BybitProcessorService implements OnModuleDestroy {
    private tokens: Array<TokenSchema> = []
    private symbols: Array<string> = []
    private readonly cacheManager: Cache

    private readonly logger = new NestLogger(BybitProcessorService.name)

    constructor(
    private readonly rest: BybitRestService,
    private readonly ws: BybitWsService,
    private readonly cacheHelpersService: CacheHelpersService,
    @InjectWinston()
    private readonly winston: Logger,
    ) {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    initialize(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenSchema>
    ) {
        this.tokens = tokens.filter((token) => !!token.cexSymbols && !!token.cexSymbols[CexId.Bybit])
        this.symbols = tokens
            .map((token) => token.cexSymbols![CexId.Bybit])
            .filter((symbol): symbol is string => symbol !== undefined)

        // subscribe tickers in batch (bybit supports multi-subscribe)
        if (this.symbols.length > 0) {
            this.ws.subscribeTicker(this.symbols, (data: BybitWsTicker) => {
                if (data?.topic?.startsWith("tickers.")) {
                    const entry = data.data?.[0]
                    if (!entry) return
                    const token = this.tokens.find((token) => token.cexSymbols![CexId.Bybit] === entry.s)
                    if (!token) return
                    const lastPrice = parseFloat(entry.c)

                    this.winston.debug(WinstonLog.BybitWsTicker, {
                        id: token.displayId,
                        last: lastPrice,
                    })

                    this.cacheManager.set(
                        createCacheKey(CacheKey.TokenPriceData, token.displayId),
                        { price: lastPrice },
                    )
                }
            })
        }

        this.logger.log(
            `Initialized BybitProcessorService for: ${tokenIds.join(", ")}`,
        )
    }

  @Cron("*/3 * * * * *")
    async fetchRestSnapshot() {
        if (this.tokens.length === 0) return
        try {
            const prices = await this.rest.getPrices(this.symbols as Array<string>)

            await this.cacheHelpersService.mset<{ price: number }>({
                entries: prices.map((price) => ({
                    key: createCacheKey(CacheKey.TokenPriceData, price.symbol),
                    value: { price: price.price },
                })),
                autoSelect: true,
            })
            this.winston.debug(WinstonLog.BybitRestSnapshot, { prices })
        } catch (err) {
            this.winston.error(WinstonLog.BybitRestError, {
                symbols: this.symbols,
                error: (err as Error).message,
            })
        }
    }

  onModuleDestroy() {
      this.ws.onModuleDestroy()
  }
}



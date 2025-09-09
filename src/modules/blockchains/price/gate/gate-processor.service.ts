import {
    Injectable,
    OnModuleDestroy,
    Logger as NestLogger,
} from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { GateRestService } from "./gate-rest.service"
import { GateWsService, GateWsTicker } from "./gate-ws.service"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { CexId, TokenId, TokenLike } from "@modules/databases"
import { EventEmitterService } from "@modules/event"
import { EventName } from "@modules/event"

@Injectable()
export class GateProcessorService implements OnModuleDestroy {
    private tokens: Array<TokenLike> = []
    private symbols: Array<string> = []
    private readonly cacheManager: Cache

    private readonly logger = new NestLogger(GateProcessorService.name)

    constructor(
    private readonly rest: GateRestService,
    private readonly ws: GateWsService,
    private readonly cacheHelpersService: CacheHelpersService,
    private readonly eventEmitterService: EventEmitterService,
    @InjectWinston()
    private readonly winston: Logger,
    ) {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    initialize(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>
    ) {
        this.tokens = tokens
        this.symbols = tokens
            .map((token) => token.cexSymbols[CexId.Gate])
            .filter((symbol): symbol is string => symbol !== undefined)
        for (const tokenId of tokenIds) {
            const token = tokens.find((token) => token.displayId === tokenId)
            if (!token) {
                this.logger.error(`Token ${tokenId} not found`)
                continue
            }
            const symbol = token.cexSymbols[CexId.Gate]
            if (!symbol) {
                this.logger.error(`Token ${tokenId} has no gate symbol`)
                continue
            }
            this.subscribeTicker(token.displayId)
        }

        this.logger.log(
            `Initialized GateProcessorService for: ${tokenIds.join(", ")}`,
        )
    }

    private subscribeTicker(tokenId: TokenId) {
        const token = this.tokens.find((token) => token.displayId === tokenId)
        if (!token) {
            this.logger.error(`Token ${tokenId} not found`)
            return
        }
        const symbol = token.cexSymbols[CexId.Gate]
        if (!symbol) {
            this.logger.error(`Token ${tokenId} has no gate symbol`)
            return
        }
        this.ws.subscribeTicker(symbol, async (data: GateWsTicker) => {
            if (!data || data.event !== "update" || !data.result) return
            const lastPrice = parseFloat(data.result.last)

            this.winston.debug("Gate.WS.Ticker", {
                id: token.displayId,
                last: lastPrice,
            })

            await this.cacheManager.set(
                createCacheKey(CacheKey.TokenPriceData, token.displayId),
                { price: lastPrice },
            )
            this.eventEmitterService.emit(
                EventName.PricesUpdated,
                [{
                    tokenId: token.displayId,
                    price: lastPrice,
                }]
            )
        })
    }

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
            this.winston.debug("Gate.REST.Snapshot", { prices })
            this.eventEmitterService.emit(
                EventName.PricesUpdated,
                prices.map(
                    price => 
                        ({
                            tokenId: price.symbol,
                            price: price.price,
                        }))
            )
        } catch (err) {
            this.winston.error("Gate.REST.Error", {
                symbols: this.symbols,
                error: (err as Error).message,
            })
        }
    }

  onModuleDestroy() {
      this.ws.onModuleDestroy()
  }
}



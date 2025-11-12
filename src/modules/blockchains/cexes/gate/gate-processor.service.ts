import {
    Injectable,
    OnModuleDestroy,
    Logger as NestLogger,
} from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { GateRestService } from "./gate-rest.service"
import { GateWsService, GateWsTicker } from "./gate-ws.service"
import { Logger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { CacheKey, createCacheKey, CacheService } from "@modules/cache"
import { CexId, TokenId, TokenSchema } from "@modules/databases"
import { EventEmitterService } from "@modules/event"
import { EventName } from "@modules/event"

@Injectable()
export class GateProcessorService implements OnModuleDestroy {
    private tokens: Array<TokenSchema> = []
    private symbols: Array<string> = []

    private readonly logger = new NestLogger(GateProcessorService.name)

    constructor(
    private readonly rest: GateRestService,
    private readonly ws: GateWsService,
    private readonly cacheService: CacheService,
    private readonly eventEmitterService: EventEmitterService,
    @InjectWinston()
    private readonly winston: Logger,
    ) {
    }

    initialize(tokenIds: Array<TokenId>, tokens: Array<TokenSchema>) {
        this.tokens = tokens.filter((token) => !!token.cexSymbols && !!token.cexSymbols[CexId.Gate])
        this.symbols = tokens
            .map((token) => token.cexSymbols![CexId.Gate])
            .filter((symbol): symbol is string => symbol !== undefined)
        for (const tokenId of tokenIds) {
            const token = tokens.find((token) => token.displayId === tokenId)
            if (!token) {
                this.logger.error(`Token ${tokenId} not found`)
                continue
            }
            const symbol = token.cexSymbols![CexId.Gate]
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
        const symbol = token.cexSymbols![CexId.Gate]
        if (!symbol) {
            this.logger.error(`Token ${tokenId} has no gate symbol`)
            return
        }
        this.ws.subscribeTicker(symbol, async (data: GateWsTicker) => {
            if (!data || data.event !== "update" || !data.result) return
            const lastPrice = parseFloat(data.result.last)

            this.winston.debug(WinstonLog.GateWsTicker, {
                id: token.displayId,
                last: lastPrice,
            })

            await this.cacheService.set(
                {
                    key: createCacheKey(CacheKey.TokenPriceData, token.displayId),
                    value: { price: lastPrice },
                }
            )
            this.eventEmitterService.emit(EventName.PricesUpdated, [
                {
                    tokenId: token.displayId,
                    price: lastPrice,
                },
            ])
        })
    }

  @Cron("*/3 * * * * *")
    async fetchRestSnapshot() {
        if (this.tokens.length === 0) return
        const tokens = this.tokens.filter((token) => token.cexSymbols![CexId.Gate])
        try {
            const prices = await Promise.all(
                this.symbols.map(async (symbol) => {
                    const { price } = await this.rest.getPrice(symbol)
                    return {
                        symbol,
                        price: price,
                    }
                }),
            )
            await this.cacheService.mset({
                entries: prices.map((price) => ({
                    key: createCacheKey(CacheKey.TokenPriceData, price.symbol),
                    value: { price: price.price },
                })),   
            })
            this.winston.debug(WinstonLog.GateRestSnapshot, { prices })
            this.eventEmitterService.emit(
                EventName.PricesUpdated,
                prices.map((price) => ({
                    tokenId: tokens.find(
                        (token) => token.cexSymbols![CexId.Gate] === price.symbol,
                    )?.displayId,
                    price: price.price,
                })),
            )
        } catch (err) {
            this.winston.error(WinstonLog.GateRestError, {
                symbols: tokens.map((token) => token.cexSymbols![CexId.Gate]),
                error: (err as Error).message,
            })
        }
    }

  onModuleDestroy() {
      this.ws.onModuleDestroy()
  }
}

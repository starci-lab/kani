import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"
import { CacheService } from "@modules/cache"
import { EventEmitterService } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { AsyncService } from "@modules/mixin"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { Network } from "@modules/common"
import { TokenListIsEmptyException } from "@exceptions"

@Injectable()
export class BinanceLastPriceService implements OnModuleDestroy, OnModuleInit {
    private ws: WebSocket
    constructor(
        private readonly cacheService: CacheService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectWinston()
        private readonly winston: Logger,
        private readonly asyncService: AsyncService,
    ) {
    }

    onModuleInit() {
        this.ws = new WebSocket(BINANCE_WS_URL)
    }

    subscribe() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => 
                    token.network === Network.Mainnet 
                && !!token.cexIds?.includes(CexId.Binance)
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Binance tokens found for mainnet")
        }
        const symbols = tokens.map(token => token.cexSymbols?.[CexId.Binance] ?? token.displayId)
        this.ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: symbols,
                id: 1,
            }))
        this.ws.onmessage = async (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            console.log(data)
            // const lastPrice = parseFloat(data.c)
            // await this.asyncService.allIgnoreError([
            //     this.cacheService.set({
            //         key: createCacheKey(
            //             CacheKey.WsLastPrice, 
            //             CexId.Binance
            //         ),
            //         value: lastPrice,
            //     })
            // ])
            // this.winston.debug(
            //     WinstonLog.WsLastPrice, 
            //     {
            //         cexId: CexId.Binance,
            //         symbol,
            //         lastPrice,
            //     }
            // )
        }
    }

    onModuleDestroy() {
        this.ws.close()
    }
}

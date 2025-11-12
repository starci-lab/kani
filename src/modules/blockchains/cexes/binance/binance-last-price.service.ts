import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { Logger } from "winston"
import { InjectWinston } from "@modules/winston"
import { EventEmitterService } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { AsyncService } from "@modules/mixin"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { Network } from "@modules/common"
import { TokenListIsEmptyException } from "@exceptions"
import { InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"

@Injectable()
export class BinanceLastPriceService implements OnApplicationShutdown, OnApplicationBootstrap {
    private ws: WebSocket
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectWinston()
        private readonly winston: Logger,
        private readonly asyncService: AsyncService,
    ) {
    }

    onApplicationBootstrap() {
        this.ws = new WebSocket(BINANCE_WS_URL)
        const ws = new WebSocket("wss://stream.binance.com:9443/stream")

        ws.on("open", () => {
            console.log("✅ Connected")
            const msg = {
                method: "SUBSCRIBE",
                params: ["btcusdt@trade", "ethusdt@trade"],
                id: 1,
            }
            ws.send(JSON.stringify(msg)) // chỉ gửi sau khi "open"
        })

        ws.on("message", (data) => {
            const parsed = JSON.parse(data.toString())
            if (parsed.stream && parsed.data) {
                console.log(`💎 ${parsed.data.s}: ${parsed.data.p}`)
            }
        })
    }

    subscribe() {
        this.ws.on("open", () => {
            console.log("WebSocket connected!")
            this.ws.send(JSON.stringify({ method: "SUBSCRIBE", params: ["btcusdt@trade"], id: 1 }))
        })
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => 
                    token.network === Network.Mainnet 
                && !!token.cexIds?.includes(CexId.Binance)
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Binance tokens found for mainnet")
        }
        const symbols = tokens.map(token => token.cexSymbols?.[CexId.Binance]).filter(Boolean)
        this.ws.on("message", async (event: WebSocket.MessageEvent) => {
            const data = JSON.parse(event.toString())
            console.log("data", data)
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
        })
        this.ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: symbols,
                id: 1,
            }))
    }

    onApplicationShutdown() {
        this.ws.close()
    }
}

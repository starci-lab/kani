import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    GATE_WS_URL 
} from "./constants"
import {
    DayjsService, 
    RetryService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    GateTokenRegistryService 
} from "./token-registry.service"
import {
    WebSocketStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
  
@Injectable()
export class GateOrderBookService implements OnApplicationBootstrap {
    constructor(
      private readonly gateTokenRegistryService: GateTokenRegistryService,
      private readonly retryService: RetryService,
      private readonly winstonService: WinstonService,
      private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
      private readonly dayjsService: DayjsService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.gateTokenRegistryService.getSymbols()
        if (!symbols.length) return

        this.retryService.retry({
            options: {
                retries: Infinity,
            },
            action: async () => {
                const connection = new WebSocketStreamConnection(GATE_WS_URL)
                const abortController = new AbortController()
                let timeout: NodeJS.Timeout | undefined = undefined

                const resetTimeout = () => {
                    if (timeout) {
                        clearTimeout(timeout)
                    }
                    timeout = setTimeout(
                        () => abortController.abort(),
                        envConfig().cexes.gate.ws.idleTimeout,
                    )
                }

                const startTime = this.dayjsService.now()
                const stream = await this.streamAsyncIteratorService.createStream({
                    connection,
                    signal: abortController.signal,
                    onOpen: (connection: WebSocketStreamConnection) => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionOpened,
                            {
                                streamName: "gate-order-book",
                                symbols,
                            })
                        resetTimeout()
                        connection.ws.send(JSON.stringify({
                            channel: "spot.book_ticker",
                            event: "subscribe",
                            time: this.dayjsService.now().unix(),
                            payload: symbols,
                        }))
                    },
                    onError: (error: Error) => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionError,
                            {
                                error: error.message,
                                streamName: "gate-order-book",
                                symbols,
                            })
                    },
                    onClose: () => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionClosed,
                            {
                                streamName: "gate-order-book",
                                symbols,
                                durationMs: this.dayjsService.now().diff(
                                    startTime,
                                    "millisecond"
                                ),
                            })
                    }
                })

                for await (const data of stream) {
                    try {
                        // const parsed = JSON.parse(data.toString()) as GateBookTickerUpdate
                        // const tokenId = this.gateTokenRegistryService.getTokenIdBySymbol(parsed.result.s)
                        // if (!tokenId) continue

                        // const orderBook: OrderBook = {
                        //     bidPrice: parseFloat(parsed.result.b),
                        //     bidQty: parseFloat(parsed.result.B),
                        //     askPrice: parseFloat(parsed.result.a),
                        //     askQty: parseFloat(parsed.result.A),
                        // }
 
                        // if (
                        //     !Number.isFinite(orderBook.bidPrice) ||
                        //         !Number.isFinite(orderBook.bidQty) ||
                        //         !Number.isFinite(orderBook.askPrice) ||
                        //         !Number.isFinite(orderBook.askQty)
                        // ) {
                        //     continue
                        // }
                        resetTimeout()
                    } catch (error) {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionError,
                            {
                                error: error.message,
                                streamName: "gate-order-book",
                                symbols,
                            })
                    }
                }
            }
        })
    }
}
  
export interface GateBookTickerUpdate {
    time: number;       // timestamp in seconds
    time_ms: number;    // timestamp in milliseconds
    channel: "spot.book_ticker";
    event: "update";
    result: GateBookTickerResult;
  }
  
export interface GateBookTickerResult {
    t: number;   // update time in milliseconds
    u: number;   // update ID or sequence number
    s: string;   // currency pair, e.g., "DEEP_USDT"
    b: string;   // best bid price
    B: string;   // best bid quantity
    a: string;   // best ask price
    A: string;   // best ask quantity
  }
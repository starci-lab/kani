import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import WebSocket from "ws"

export interface WsOrderBook {
  bids: Array<[string, string]>
  asks: Array<[string, string]>
}

export interface WsTicker {
  e: string   // event type
  E: number   // event time
  s: string   // symbol
  c: string   // last price
  o: string   // open price
  h: string   // high price
  l: string   // low price
  v: string   // base asset volume
  q: string   // quote asset volume
}

@Injectable()
export class BinanceWsService implements OnModuleDestroy {
    private readonly logger = new Logger(BinanceWsService.name)
    private readonly wsBase = "wss://stream.binance.com:9443/ws"
    private ws: WebSocket | null = null

    /**
   * Subscribe to order book stream with auto-reconnect
   */
    subscribeOrderBook(
        symbol: string,
        depth = 20,
        interval = 1000,
        onMessage: (data: WsOrderBook) => void,
    ) {
        const streamName = `${symbol.toLowerCase()}@depth${depth}@${interval}ms`
        this.connect(streamName, onMessage)
    }

    /**
   * Subscribe to ticker stream with auto-reconnect
   */
    subscribeTicker(
        symbol: string,
        onMessage: (data: WsTicker) => void,
    ) {
        const streamName = `${symbol.toLowerCase()}@ticker`
        this.connect(streamName, onMessage)
    }

    /**
   * Handle connection + auto-reconnect
   */
    private connect<T>(streamName: string, onMessage: (data: T) => void) {
        const url = `${this.wsBase}/${streamName}`
        this.ws = new WebSocket(url)

        this.ws.on("open", () => {
            this.logger.log(`Connected to Binance WS: ${streamName}`)
        })

        this.ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const data = JSON.parse(raw.toString())
                onMessage(data)
            } catch (err) {
                this.logger.error(`WS parse error (${streamName}):`, err)
            }
        })

        this.ws.on("close", () => {
            this.logger.warn(`Binance WS closed: ${streamName}, retrying in 1s...`)
            setTimeout(() => this.connect(streamName, onMessage), 1000)
        })

        this.ws.on("error", (err) => {
            this.logger.error(`WS error (${streamName}):`, err)
            this.ws?.close() // trigger close → reconnect
        })
    }

    onModuleDestroy() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }
}

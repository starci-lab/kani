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
    private sockets: Map<string, WebSocket> = new Map()

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
   * Create and manage a websocket connection for one stream
   */
    private connect<T>(streamName: string, onMessage: (data: T) => void) {
        const url = `${this.wsBase}/${streamName}`
        const ws = new WebSocket(url)

        this.sockets.set(streamName, ws)

        ws.on("open", () => {
            this.logger.log(`✅ Connected to Binance WS: ${streamName}`)
            this.startHeartbeat(ws)
        })

        ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const data = JSON.parse(raw.toString())
                onMessage(data)
            } catch (err) {
                this.logger.error(`WS parse error (${streamName}):`, err)
            }
        })

        ws.on("close", () => {
            this.logger.warn(`❌ Binance WS closed: ${streamName}, retrying in 1s...`)
            this.sockets.delete(streamName)
            setTimeout(() => this.connect(streamName, onMessage), 1000)
        })

        ws.on("error", (err) => {
            this.logger.error(`WS error (${streamName}):`, err)
            ws.close() // trigger close → reconnect
        })
    }

    /**
   * Heartbeat to keep connection alive
   */
    private startHeartbeat(ws: WebSocket) {
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping()
            }
        }, 30_000)

        ws.on("close", () => clearInterval(interval))
        ws.on("error", () => clearInterval(interval))
    }

    /**
   * Close all sockets when app stops
   */
    onModuleDestroy() {
        for (const [streamName, ws] of this.sockets) {
            this.logger.log(`Closing WS: ${streamName}`)
            ws.close()
        }
        this.sockets.clear()
    }
}
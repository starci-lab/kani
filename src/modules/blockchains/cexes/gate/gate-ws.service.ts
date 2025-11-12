import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import WebSocket from "ws"

export interface GateWsTicker {
  time: number
  channel: string
  event: string
  result: {
    currency_pair: string
    last: string
  }
}

@Injectable()
export class GateWsService implements OnModuleDestroy {
    private readonly logger = new Logger(GateWsService.name)
    private readonly wsBase = "wss://api.gateio.ws/ws/v4/"
    private sockets: Map<string, WebSocket> = new Map()
    private heartbeats: Map<string, NodeJS.Timeout> = new Map()

    /**
   * Subscribe ticker for one symbol (1 socket per symbol)
   */
    subscribeTicker(symbol: string, onMessage: (data: GateWsTicker) => void) {
        const key = `spot.tickers:${symbol}`
        if (this.sockets.has(key)) {
            this.logger.warn(`Already subscribed: ${symbol}`)
            return
        }

        const ws = new WebSocket(this.wsBase)
        this.sockets.set(key, ws)

        ws.on("open", () => {
            this.logger.log(`✅ Connected Gate WS for ${symbol}`)
            const payload = {
                time: Math.floor(Date.now() / 1000),
                channel: "spot.tickers",
                event: "subscribe",
                payload: [symbol],
            }
            ws.send(JSON.stringify(payload))
            this.startHeartbeat(key, ws)
        })

        ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const data = JSON.parse(raw.toString())
                if (data.channel === "spot.tickers") {
                    onMessage(data)
                }
            } catch (err) {
                this.logger.error(`WS parse error (${symbol}):`, err)
            }
        })

        ws.on("close", () => {
            this.logger.warn(`❌ Gate WS closed for ${symbol}, retrying in 1s...`)
            this.stopHeartbeat(key)
            this.sockets.delete(key)
            setTimeout(() => this.subscribeTicker(symbol, onMessage), 1000)
        })

        ws.on("error", (err) => {
            this.logger.error(`WS error (${symbol}):`, err)
            ws.close()
        })
    }

    /**
   * Unsubscribe (close socket) for one symbol
   */
    unsubscribeTicker(symbol: string) {
        const key = `spot.tickers:${symbol}`
        const ws = this.sockets.get(key)
        if (ws) {
            this.logger.log(`Unsubscribing ${symbol}`)
            ws.close()
            this.stopHeartbeat(key)
            this.sockets.delete(key)
        }
    }

    /**
   * Heartbeat for each socket
   */
    private startHeartbeat(key: string, ws: WebSocket) {
        this.stopHeartbeat(key)
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping()
            }
        }, 30_000)
        this.heartbeats.set(key, interval)
    }

    private stopHeartbeat(key: string) {
        const interval = this.heartbeats.get(key)
        if (interval) {
            clearInterval(interval)
            this.heartbeats.delete(key)
        }
    }

    /**
   * Cleanup all sockets
   */
    onModuleDestroy() {
        for (const [key, ws] of this.sockets) {
            this.logger.log(`Closing WS: ${key}`)
            ws.close()
            this.stopHeartbeat(key)
        }
        this.sockets.clear()
        this.heartbeats.clear()
    }
}
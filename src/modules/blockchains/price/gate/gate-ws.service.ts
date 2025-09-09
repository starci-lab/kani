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
    private ws: WebSocket | null = null

    subscribeTicker(symbol: string, onMessage: (data: GateWsTicker) => void) {
        const payload = {
            time: Math.floor(Date.now() / 1000),
            channel: "spot.tickers",
            event: "subscribe",
            payload: [symbol],
        }
        this.connect(payload, onMessage)
    }

    private connect<T>(subscribeMsg: unknown, onMessage: (data: T) => void) {
        this.ws = new WebSocket(this.wsBase)

        this.ws.on("open", () => {
            this.logger.log("Connected to Gate WS, subscribing...")
            this.ws?.send(JSON.stringify(subscribeMsg))
        })

        this.ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const data = JSON.parse(raw.toString())
                onMessage(data)
            } catch (err) {
                this.logger.error("WS parse error:", err)
            }
        })

        this.ws.on("close", () => {
            this.logger.warn("Gate WS closed, retrying in 1s...")
            setTimeout(() => this.connect(subscribeMsg, onMessage), 1000)
        })

        this.ws.on("error", (err) => {
            this.logger.error("WS error:", err)
            this.ws?.close()
        })
    }

    onModuleDestroy() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }
}



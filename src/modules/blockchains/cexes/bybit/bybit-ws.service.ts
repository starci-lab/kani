import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import WebSocket from "ws"

export interface BybitWsTicker {
  topic: string
  type: string
  ts: number
  data: Array<{
    s: string // symbol
    c: string // last price
  }>
}

@Injectable()
export class BybitWsService implements OnModuleDestroy {
    private readonly logger = new Logger(BybitWsService.name)
    private readonly wsBase = "wss://stream.bybit.com/v5/public/spot"
    private ws: WebSocket | null = null

    subscribeTicker(symbols: Array<string>, onMessage: (data: BybitWsTicker) => void) {
        const payload = {
            op: "subscribe",
            args: symbols.map((s) => `tickers.${s}`),
        }
        this.connect(payload, onMessage)
    }

    private connect<T>(subscribeMsg: unknown, onMessage: (data: T) => void) {
        this.ws = new WebSocket(this.wsBase)

        this.ws.on("open", () => {
            this.logger.log("Connected to Bybit WS, subscribing...")
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
            this.logger.warn("Bybit WS closed, retrying in 1s...")
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



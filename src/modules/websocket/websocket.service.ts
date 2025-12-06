import { Injectable } from "@nestjs/common"
import WebSocket from "ws"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
export interface CreateWebSocketParams<
  OnMessageParams,
  OnErrorParams,
> {
    streamName: string; // stream name to let winston know which stream is this, for better logging
  url: string;
  options?: WebSocket.ClientOptions;
  onMessage?: (data: OnMessageParams) => void;
  onError?: (error: OnErrorParams) => void;
  onClose?: (data: number) => void;
  onOpen?: () => void;
  reconnectInterval?: number; // optional: milliseconds between reconnect attempts
  maxRetries?: number;       // optional: maximum reconnect attempts
}

@Injectable()
export class WebsocketService {
    constructor(
        @InjectWinston()
        private readonly winston: winstonLogger,
    ) {}
    createWebSocket<OnMessageParams, OnErrorParams = void>(
        params: CreateWebSocketParams<
      OnMessageParams,
      OnErrorParams
    >
    ): WebSocket {
        const {
            streamName,
            url,
            options,
            onMessage,
            onError,
            onClose,
            onOpen,
            reconnectInterval = 3000,
            maxRetries = Infinity,
        } = params

        let ws: WebSocket | null = null
        let retries = 0

        const connect = () => {
            ws = new WebSocket(url, options)
            ws.on("open", () => {
                retries = 0 // reset retry counter
                onOpen?.()
                this.winston.info(WinstonLog.WebsocketConnected, { streamName })
            })
            ws.on("message", (data: WebSocket.RawData) => {
                try {
                    onMessage?.(JSON.parse(data.toString()) as OnMessageParams)
                } catch (err) {
                    this.winston.error(WinstonLog.WebsocketMessageParseError, {
                        streamName,
                        error: err,
                        data: data.toString(),
                    })
                }
            })
            ws.on("error", (error) => {
                try {
                    onError?.(error as unknown as OnErrorParams)
                } catch (err) {
                    this.winston.error(WinstonLog.WebsocketConnectionError, {
                        streamName,
                        error: err,
                    })
                }
                ws?.close() // trigger reconnect
            })

            ws.on("close", (closeEvent) => {
                try {
                    onClose?.(closeEvent)
                } catch (err) {
                    this.winston.error(WinstonLog.WebsocketCloseError, {
                        streamName,
                        error: err,
                    })
                }
                if (retries < maxRetries) {
                    retries++
                    this.winston.debug(WinstonLog.WebsocketReconnect, { streamName, retries, reconnectInterval })
                    setTimeout(connect, reconnectInterval)
                } else {
                    this.winston.error(WinstonLog.WebsocketMaxRetriesReached, { streamName, maxRetries })
                }
            })
        }

        connect()
        if (!ws) {
            throw new Error("Failed to create WebSocket")
        }
        return ws
    }
}
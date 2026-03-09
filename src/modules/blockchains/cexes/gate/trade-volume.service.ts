import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    GATE_TRADE_VOLUME_STREAM_NAME,
    GATE_WS_URL,
} from "./constants"
import {
    CexId,
    PrimaryInfluxdbVolumeBucketService,
} from "@modules/databases"
import {
    envConfig,
} from "@modules/env"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    GateTokenRegistryService,
} from "./token-registry.service"
import type {
    GateTradeUpdate,
} from "./types"
import _ from "lodash"
import {
    AsyncService,
    DayjsService,
    RetryService,
} from "@modules/mixin"
import {
    WebSocketStreamConnection,
    StreamAsyncIteratorService,
} from "@modules/stream-async-iterator"
import Decimal from "decimal.js"
import {
    Dayjs,
} from "dayjs"

/**
 * Service for handling Gate.io trade volume (volume per fill).
 * Subscribes to the spot.trades stream; each message is one trade.
 * Writes quote volume (amount * price) per trade to InfluxDB.
 *
 * @example
 * Service subscribes to trade stream on bootstrap and writes volume to InfluxDB.
 */
@Injectable()
export class GateTradeVolumeService implements OnApplicationBootstrap {
    constructor(
        private readonly retryService: RetryService,
        private readonly gateTokenRegistryService: GateTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly primaryInfluxdbVolumeBucketService: PrimaryInfluxdbVolumeBucketService,
    ) {}

    /**
     * Subscribes to Gate.io spot.trades stream per batch and writes quote volume per fill to InfluxDB.
     *
     * @returns void
     */
    onApplicationBootstrap(): void {
        const symbols = this.gateTokenRegistryService.getSymbols()
        if (!symbols.length) return
        const batches = _.chunk(
            symbols,
            envConfig().cexes.gate.chunks.lastPrice,
        )

        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    const connection = new WebSocketStreamConnection(GATE_WS_URL)
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined
                    const resetTimeout = () => {
                        if (timeout) clearTimeout(timeout)
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().cexes.gate.ws.idleTimeout,
                        )
                    }

                    let startTime: Dayjs | null = null
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (conn: WebSocketStreamConnection) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: GATE_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                            startTime = this.dayjsService.now()
                            resetTimeout()
                            conn.ws.send(
                                JSON.stringify({
                                    channel: "spot.trades",
                                    event: "subscribe",
                                    time: this.dayjsService.now().unix(),
                                    payload: batch,
                                }),
                            )
                        },
                        onError: (error: Error) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: GATE_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: GATE_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                    durationMs: startTime
                                        ? this.dayjsService.now().diff(
                                            startTime,
                                            "millisecond",
                                        )
                                        : null,
                                },
                            )
                        },
                    })
                    for await (const data of stream) {
                        try {
                            const parsed = JSON.parse(data.toString()) as GateTradeUpdate
                            if (parsed.channel !== "spot.trades" || !parsed.result) continue
                            const { currency_pair: symbol, price: priceStr, amount: amountStr } =
                                parsed.result
                            const quoteVolume = parseFloat(amountStr) * parseFloat(priceStr)
                            const tokenVolumes = this.gateTokenRegistryService.resolveTokenVolumes({
                                tokenVolumeDataArray: [
                                    {
                                        symbol,
                                        volume: quoteVolume,
                                    },
                                ],
                            })
                            if (!tokenVolumes.length) continue
                            resetTimeout()
                            await this.asyncService.allIgnoreError(
                                tokenVolumes.map(async (tokenVolume) => {
                                    await this.primaryInfluxdbVolumeBucketService.write({
                                        id: tokenVolume.id,
                                        volume: new Decimal(tokenVolume.volume),
                                        cexId: CexId.Gate,
                                    })
                                }),
                            )
                        } catch (error) {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: (error as Error).message,
                                    streamName: GATE_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                        }
                    }
                },
            })
        }
    }
}

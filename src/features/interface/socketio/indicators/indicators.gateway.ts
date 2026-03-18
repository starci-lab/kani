import {
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets"
import {
    IndicatorsWebSocketGateway,
    socketIoPrivyAuthMiddleware,
    WsResponseService,
    WsSuccessMessage,
    WsTransformInterceptor,
} from "@modules/socketio"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    TypedSocket,
} from "@modules/socketio"
import {
    Namespace,
} from "socket.io"
import {
    WebSocketServer,
} from "@nestjs/websockets"
import {
    Interval,
} from "@nestjs/schedule"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    PublicationEvent,
    SubscriptionEvent,
} from "../enums"
import {
    PublicationIndicatorsEventPayload,
    SubscribeIndicatorsEventPayload,
} from "../types"
import {
    UseInterceptors,
} from "@nestjs/common"
import {
    AsyncService,
} from "@modules/mixin"
import {
    envConfig,
} from "@modules/env"

/**
 * WebSocket gateway for indicators.
 */
@IndicatorsWebSocketGateway()
export class IndicatorsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly winstonService: WinstonService,
        private readonly cacheService: CacheService,
        private readonly wsResponseService: WsResponseService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * The WebSocket server.
     */
    @WebSocketServer()
    private readonly server: Namespace

    /**
     * After init.
     */
    afterInit() {
        this.server.use(socketIoPrivyAuthMiddleware)
    }

    /**
     * Handle connection.
     */
    handleConnection(client: TypedSocket) {
        this.winstonService.log(
            WinstonLog.SocketIoClientConnected,
            {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    /**
     * Handle disconnect.
     * 
     * @param client - The client.
     */
    handleDisconnect(client: TypedSocket) {
        delete client.data.botId
        this.winstonService.log(
            WinstonLog.SocketIoClientDisconnected,
            {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    /**
     * Subscribe to violate indicator results for a bot.
     * Client receives periodic updates from cache (ViolateIndicatorResults).
     * 
     * @param client - The client.
     * @param data - The data.
     */
    @WsSuccessMessage("Subscribed to indicators successfully")
    @UseInterceptors(WsTransformInterceptor)
    @SubscribeMessage(SubscriptionEvent.Indicators)
    async handleSubscribeIndicators(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() data: SubscribeIndicatorsEventPayload,
    ) {
        client.data.botId = data.botId
        await this.publishIndicatorsSingle(client.id)
    }

    /**
     * Publish indicators to all clients.
     */
    @Interval(envConfig().socketIo.indicators.interval)
    async publishIndicators() {
        const promises: Array<Promise<void>> = []
        for (const socket of [...this.server.sockets.values()]) {
            promises.push(this.publishIndicatorsSingle(socket.id))
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Publish indicators to a single client.
     */
    async publishIndicatorsSingle(clientId: string) {
        const client = this.server.sockets.get(clientId) as TypedSocket | undefined
        if (!client) {
            return
        }
        const botId = client.data.botId as string | undefined
        if (!botId) {
            return
        }
        const data = await this.cacheService.get({
            key: CacheKey.ViolateIndicatorResults,
            args: [botId],
        })
        if (!data) {
            return
        }
        const payload: PublicationIndicatorsEventPayload = {
            entries: data.results,
        }
        this.wsResponseService.success({
            message: "Indicators updated successfully",
            data: payload,
            client,
            eventName: PublicationEvent.Indicators,
        })
    }
}

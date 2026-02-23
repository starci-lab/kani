import {
    OnGatewayInit,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets"
import {
    socketIoPrivyAuthMiddleware,
    WsResponseService,
    WsSuccessMessage,
    WsTransformInterceptor,
    CallbackWebSocketGateway,
} from "@modules/socketio"
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
    PublicationEvent,
    SubscriptionEvent,
} from "../enums"
import {
    SubscribeConfirmWithdrawalEventPayload,
} from "../types"
import {
    UseInterceptors,
} from "@nestjs/common"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventName,
    ConfirmWithdrawalEventPayload 
} from "@modules/event"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@CallbackWebSocketGateway()
export class CallbackGateway implements OnGatewayInit {
    constructor(
        private readonly winstonService: WinstonService,
        private readonly wsResponseService: WsResponseService,
    ) { }

    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.server.use(socketIoPrivyAuthMiddleware) // use the auth middleware for the namespace
    }

    /**
     * Subscribe to confirm withdrawal.
     */
    @WsSuccessMessage("Subscribed to confirm withdrawal successfully")
    @UseInterceptors(WsTransformInterceptor)
    @SubscribeMessage(SubscriptionEvent.ConfirmWithdrawal)
    async handleSubscribeConfirmWithdrawal(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() data: SubscribeConfirmWithdrawalEventPayload
    ) {
        client.data.botId = data.botId
    }

    /**
     * Periodically fetch dynamic liquidity pool info from cache and publish
     * results to each subscribed client.
     *
     * Note: we resolve pool type implicitly by trying CLMM key first, then DLMM.
     */
    @OnEvent(EventName.ConfirmWithdrawal)
    async publishConfirmWithdrawal(
        event: ConfirmWithdrawalEventPayload
    ) {
        const clientId = [...this.server.sockets.values()].find((socket) => socket.data.botId === event.botId)?.id
        if (!clientId) {
            this.winstonService.log(
                WinstonLog.SocketIoClientIdNotFound,
                {
                    botId: event.botId,
                }
            )
            return
        }
        const client = this.server.sockets.get(clientId)
        if (!client) {
            this.winstonService.log(
                WinstonLog.SocketIoClientNotFound,
                {
                    botId: event.botId,
                }
            )
            return
        }
        this.wsResponseService.success(
            {
                message: "Confirm withdrawal published successfully",
                data: event,
                client,
                eventName: PublicationEvent.ConfirmWithdrawal,
            }
        ) 
    }
}



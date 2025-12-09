import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets"
import { CoreWebSocketGateway, socketIoAuthMiddleware } from "@modules/socketio"
import { Logger } from "@nestjs/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { TypedSocket } from "@modules/socketio"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"
import { Namespace } from "socket.io"
import { WebSocketServer } from "@nestjs/websockets"
import { SocketIoEvent } from "@modules/socketio/constants"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"

@CoreWebSocketGateway()
export class CoreGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(CoreGateway.name)
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.logger.debug("Core gateway initialized")
        this.server.use(socketIoAuthMiddleware) // use the auth middleware for the namespace
    }

    // handle the client connected
    handleConnection(client: TypedSocket) {
        // log the client connected to loki
        this.winstonLogger.debug(
            WinstonLog.SocketIoClientConnected, {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    // handle the client disconnected
    handleDisconnect(client: TypedSocket) {
        // log the client disconnected to loki
        this.winstonLogger.debug(
            WinstonLog.SocketIoClientDisconnected, {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    // handle the liquidity pools updated
    @OnEvent(EventName.LiquidityPoolsFetched)
    handleLiquidityPoolsUpdated(payload: LiquidityPoolsFetchedEvent) {
        // emit the event to the client
        this.server.emit(
            SocketIoEvent.LiquidityPoolsFetched, 
            payload
        )
    }
}
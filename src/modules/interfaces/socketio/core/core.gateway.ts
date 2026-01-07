import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets"
import { CoreWebSocketGateway, socketIoAuthMiddleware } from "@modules/socketio"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { TypedSocket } from "@modules/socketio"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"
import { Namespace } from "socket.io"
import { WebSocketServer } from "@nestjs/websockets"
import { SocketIoEvent } from "@modules/socketio/constants"
import { Cron, CronExpression } from "@nestjs/schedule"

@CoreWebSocketGateway()
export class CoreGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.server.use(socketIoAuthMiddleware) // use the auth middleware for the namespace
    }

    // handle the client connected
    handleConnection(client: TypedSocket) {
        console.log("client connected", client.data.userId)
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
    handleLiquidityPoolsUpdated(
        payload: LiquidityPoolsFetchedEvent
    ) {
        // emit the event to the client
        this.server.emit(
            SocketIoEvent.LiquidityPoolsFetched, 
            payload
        )
    }
    
    // handle the ping
    @Cron(CronExpression.EVERY_5_SECONDS) // every 5 seconds
    handlePing() {
        this.server.emit(
            "ping",
            "pong"
        )   
    }
}
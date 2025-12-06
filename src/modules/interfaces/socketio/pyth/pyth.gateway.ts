import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets"
import { PythWebSocketGateway, socketIoAuthMiddleware } from "@modules/socketio"
import { Logger } from "@nestjs/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { TypedSocket } from "@modules/socketio"
import { EventName, PythSuiPricesUpdatedEvent } from "@modules/event"
import { OnEvent } from "@nestjs/event-emitter"
import { Namespace } from "socket.io"
import { WebSocketServer } from "@nestjs/websockets"
import { PythPricesUpdatedEvent, SocketIoEvent } from "@modules/socketio/constants"

@PythWebSocketGateway()
export class PythGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(PythGateway.name)
    constructor(
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
    ) {}

    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.logger.debug("Pyth gateway initialized")
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

    // handle the pyth sui prices updated
    @OnEvent(EventName.PythSuiPricesUpdated)
    handlePythSuiPricesUpdated(payload: PythSuiPricesUpdatedEvent) {
        // define the event
        const event: PythPricesUpdatedEvent = {
            network: payload.network,
            tokenId: payload.tokenId,
            price: payload.price,
            chainId: payload.chainId,
        }
        // emit the event to the client
        this.server.emit(SocketIoEvent.PythPricesUpdated, event)
    }
}
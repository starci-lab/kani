import {
    OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect 
} from "@nestjs/websockets"
import {
    PythWebSocketGateway, socketIoAuthMiddleware 
} from "@modules/socketio"
import {
    WinstonLog 
} from "@modules/winston"
import {
    TypedSocket 
} from "@modules/socketio"
import {
    Namespace 
} from "socket.io"
import {
    WebSocketServer 
} from "@nestjs/websockets"
import {
    Interval 
} from "@nestjs/schedule"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    AsyncService 
} from "@modules/mixin"
import {
    PythPriceUpdated 
} from "@modules/socketio"
import {
    WinstonService 
} from "@modules/winston"
import {
    PriceService 
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"

@PythWebSocketGateway()
export class PriceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly asyncService: AsyncService,
    ) {}
    
    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.server.use(socketIoAuthMiddleware) // use the auth middleware for the namespace
    }

    // handle the client connected
    handleConnection(client: TypedSocket) {
        // log the client connected to loki
        this.winstonService.log(
            WinstonLog.SocketIoClientConnected,
            {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    // handle the client disconnected
    handleDisconnect(client: TypedSocket) {
        // log the client disconnected to loki
        this.winstonService.log(
            WinstonLog.SocketIoClientDisconnected,
            {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    // handle the pyth sui prices updated with interval 5s
    @Interval(envConfig().socketIo.price.broadcast.interval)
    async fetchAndBroadcast() {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        const promises: Array<Promise<void>> = []
        const prices: Array<PythPriceUpdated> = []
        for (const token of tokens) {
            promises.push(
                (
                    async () => {
                        // get the price from the cache
                        const priceCacheResult = await this.priceService.resolvePrice(
                            {
                                token,
                            }
                        )
                        // if the price is not found, push the price 0
                        if (!priceCacheResult) {
                            prices.push({
                                tokenId: token.displayId,
                                price: 0,
                            })
                            return
                        }
                    }
                )
                ()
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
}
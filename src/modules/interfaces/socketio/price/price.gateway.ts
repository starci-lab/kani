import {
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets"
import {
    PriceWebSocketGateway,
    socketIoPrivyAuthMiddleware,
    WsResponseService,
    WsSuccessMessage,
    WsTransformInterceptor,
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
    WinstonService 
} from "@modules/winston"
import {
    PriceService 
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"
import {
    SubscriptionEvent,
    SubscribePricesEventPayload,
    PublicationEvent,
    PublicationPrice,
    PublicationPriceEventPayload,
} from "../config"
import {
    SomeTokensNotFoundException,
} from "@exceptions"
import {
    UseInterceptors,
} from "@nestjs/common"
import {
    AsyncService 
} from "@modules/mixin"

@PriceWebSocketGateway()
export class PriceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    /**
     * Map of socket client id -> subscribed token ids (token record ids from memory storage).
     */
    private readonly tokenIdMap: Map<string, Array<string>> = new Map()
    constructor(
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly wsResponseService: WsResponseService,
        private readonly asyncService: AsyncService,
    ) {}
    
    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        // Use Privy auth middleware for the namespace.
        this.server.use(socketIoPrivyAuthMiddleware)
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
        // Cleanup subscription state to avoid memory leaks.
        this.tokenIdMap.delete(client.id)
        // log the client disconnected to loki
        this.winstonService.log(
            WinstonLog.SocketIoClientDisconnected,
            {
                clientId: client.id,
                userId: client.data.userId,
            },
        )
    }

    /**
     * Subscribe a client to periodic Pyth price updates for a set of tokens.
     *
     * The ids are token record ids in the primary memory storage (`tokenCollection`),
     * not display ids.
     */
    @WsSuccessMessage("Subscribed to pyth prices successfully")
    @UseInterceptors(WsTransformInterceptor)
    @SubscribeMessage(SubscriptionEvent.Price)
    async handleSubscribePrice(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() data: SubscribePricesEventPayload,
    ) {
        // Validate token ids exist.
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            id: {
                $in: data.ids,
            },
        })
        if (tokens.length !== data.ids.length) {
            throw new SomeTokensNotFoundException({
                actualCount: tokens.length,
                expectedCount: data.ids.length,
            })
        }
        this.tokenIdMap.set(client.id,
            data.ids)

        // Publish immediately so the client doesn't have to wait for the next interval tick.
        await this.publishPricesSingle(client.id)
    }

    /**
     * Periodically fetch Pyth prices and publish to each subscribed client.
     *
     * Note: we compute a shared unique token set across all clients to avoid
     * redundant work.
     */
    @Interval(envConfig().socketIo.price.broadcast.interval)
    async publishPrices() {
        const promises: Array<Promise<void>> = []
        for (const clientId of this.tokenIdMap.keys()) {
            promises.push(this.publishPricesSingle(clientId))
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Publish prices to a single client based on its current subscription.
     */
    async publishPricesSingle(
        clientId: string
    ) {
        const client = this.server.sockets.get(clientId)
        if (!client) {
            return
        }
        const ids = this.tokenIdMap.get(clientId) ?? []
        if (ids.length === 0) {
            return
        }
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            id: {
                $in: ids,
            },
        })
        const results: Record<string, PublicationPrice> = {
        }
        const promises: Array<Promise<void>> = tokens.map(
            async (token) => {
                const { price } = await this.priceService.resolvePrice({
                    token,
                })
                results[token.id] = {
                    price: price.toNumber(),
                }
            }
        )
        await this.asyncService.allIgnoreError(promises)
        const payload: PublicationPriceEventPayload = {
            results,
        }
        this.wsResponseService.success({
            message: "Prices updated successfully",
            data: payload,
            client,
            eventName: PublicationEvent.Price,
        })
    }
}
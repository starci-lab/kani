import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets"
import { PythPricesUpdatedEvent, PythWebSocketGateway, socketIoAuthMiddleware } from "@modules/socketio"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { TypedSocket } from "@modules/socketio"
import { Namespace } from "socket.io"
import { WebSocketServer } from "@nestjs/websockets"
import { Interval } from "@nestjs/schedule"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    CacheKey, 
    PythTokenPriceCacheResult, 
    InjectRedisCache, 
    createCacheKey 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { SocketIoEvent, PythPriceUpdated } from "@modules/socketio"

@PythWebSocketGateway()
export class PythGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
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

    // handle the pyth sui prices updated with interval 5s
    @Interval(5000)
    async fetchPythPrices() {
        const tokens = this.primaryMemoryStorageService.tokens
        const promises: Array<Promise<void>> = []
        const prices: Array<PythPriceUpdated> = []
        for (const token of tokens) {
            if (token.pythFeedId) {
                promises.push(
                    (
                        async () => {
                            // get the price from the cache
                            const priceCacheResult = await this.cacheManager.get<string>(
                                createCacheKey(
                                    CacheKey.PythTokenPrice, 
                                    token.displayId
                                ),
                            )
                            // if the price is not found, push the price 0
                            if (!priceCacheResult) {
                                prices.push({
                                    tokenId: token.displayId,
                                    price: 0,
                                })
                                return
                            }
                            // if the price is found, push the price
                            const { 
                                price 
                            } = this.superjson.parse<PythTokenPriceCacheResult>(priceCacheResult)
                            prices.push({
                                tokenId: token.displayId,
                                price,
                            })   
                        })
                    ()
                )
            }
        }
        await this.asyncService.allMustDone(promises)
        const event: PythPricesUpdatedEvent = {
            prices,
        }
        this.server.emit(
            SocketIoEvent.PythPricesUpdated, 
            this.superjson.stringify(event)
        )
    }
}
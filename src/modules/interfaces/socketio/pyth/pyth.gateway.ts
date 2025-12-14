import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets"
import { PythPricesUpdatedEvent, PythWebSocketGateway, socketIoAuthMiddleware } from "@modules/socketio"
import { Logger } from "@nestjs/common"
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
import { PythTokenPriceNotFoundException } from "@exceptions"
import { SocketIoEvent, PythPriceUpdated } from "@modules/socketio"

@PythWebSocketGateway()
export class PythGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(PythGateway.name)
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
                            const priceCacheResult = await this.cacheManager.get<string>(
                                createCacheKey(
                                    CacheKey.PythTokenPrice, 
                                    token.displayId
                                ),
                            )
                            if (!priceCacheResult) {
                                throw new PythTokenPriceNotFoundException(
                                    token.displayId, 
                                    "Pyth token price not found"
                                )
                            }
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
            this.superjson.serialize(event)
        )
    }
}
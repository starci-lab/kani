import {
    OnGatewayInit,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets"
import {
    socketIoPrivyAuthMiddleware,
    WsResponseService,
    WsSuccessMessage,
    WsTransformInterceptor,
    DynamicLiquidityPoolInfoWebSocketGateway,
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
    Interval,
} from "@nestjs/schedule"
import {
    AsyncService,
} from "@modules/mixin"
import {
    envConfig,
} from "@modules/env"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    SubscribeDynamicLiquidityPoolsInfoEventPayload,
    PublicationEvent,
    SubscriptionEvent,
    PublicationDynamicLiquidityPoolInfo,
    PublicationDynamicLiquidityPoolsInfoEventPayload,
} from "../config"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    SomeLiquidityPoolsNotFoundException,
} from "@exceptions"
import {
    UseInterceptors,
} from "@nestjs/common"

@DynamicLiquidityPoolInfoWebSocketGateway()
export class DynamicLiquidityPoolInfoGateway implements OnGatewayInit, OnGatewayDisconnect {
    /**
     * Map of socket client id -> subscribed liquidity pool ids.
     *
     * We keep this in-memory because subscriptions are ephemeral and tied
     * to the socket connection lifecycle.
     */
    private readonly liquidityPoolIdsByClientId: Map<string, Array<string>> = new Map()

    constructor(
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly wsResponseService: WsResponseService,
    ) {}
    
    @WebSocketServer()
    private readonly server: Namespace

    afterInit() {
        this.server.use(socketIoPrivyAuthMiddleware) // use the auth middleware for the namespace
    }
    
    @WsSuccessMessage("Subscribed to dynamic liquidity pools info successfully")
    @UseInterceptors(WsTransformInterceptor)
    @SubscribeMessage(SubscriptionEvent.DynamicLiquidityPoolsInfo)
    async handleSubscribeDynamicLiquidityPoolsInfo(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() data: SubscribeDynamicLiquidityPoolsInfoEventPayload
    ) {
        // validate the liquidity pool ids
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                id: {
                    $in: data.ids,
                },
            }
        )
        if (liquidityPools.length !== data.ids.length) {
            throw new SomeLiquidityPoolsNotFoundException(
                {
                    actualCount: liquidityPools.length,
                    expectedCount: data.ids.length,
                }
            )
        }
        // Store the latest subscription list for this client.
        this.liquidityPoolIdsByClientId.set(
            client.id,
            data.ids
        )
        // Publish immediately so the client doesn't have to wait for the next interval tick.
        await this.publishDynamicLiquidityPoolsInfoSingle(client.id)
    }

    handleDisconnect(client: TypedSocket) {
        // Cleanup subscription state to avoid memory leaks.
        this.liquidityPoolIdsByClientId.delete(client.id)
    }

    /**
     * Periodically fetch dynamic liquidity pool info from cache and publish
     * results to each subscribed client.
     *
     * Note: we resolve pool type implicitly by trying CLMM key first, then DLMM.
     */
    @Interval(envConfig().socketIo.dynamic.liquidityPoolsInfo.interval)
    async publishDynamicLiquidityPoolsInfo() {
        const promises: Array<Promise<void>> = []
        for (const clientId of this.liquidityPoolIdsByClientId.keys()) {
            promises.push(this.publishDynamicLiquidityPoolsInfoSingle(clientId))
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Publish dynamic liquidity pool info to a single client based on its current subscription.
     */
    async publishDynamicLiquidityPoolsInfoSingle(
        clientId: string
    ) {
        const client = this.server.sockets.get(clientId)
        if (!client) {
            return
        }
        const ids = this.liquidityPoolIdsByClientId.get(clientId) ?? []
        if (ids.length === 0) {
            return
        }
        const results: Record<string, PublicationDynamicLiquidityPoolInfo> = {
        }
        const promises: Array<Promise<void>> = ids.map(
            async (liquidityPoolId) => {
                const clmm = await this.cacheService.get({
                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
                    args: [liquidityPoolId],
                })
                if (clmm) {
                    results[liquidityPoolId] = clmm
                    return
                }
                const dlmm = await this.cacheService.get({
                    key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                    args: [liquidityPoolId],
                })
                if (dlmm) {
                    results[liquidityPoolId] = dlmm
                }
            }
        )
        await this.asyncService.allIgnoreError(promises)
        const payload: PublicationDynamicLiquidityPoolsInfoEventPayload = {
            results,
        }
        this.wsResponseService.success({
            message: "Dynamic liquidity pools info published successfully",
            data: payload,
            client,
            eventName: PublicationEvent.DynamicLiquidityPoolsInfo,
        })
    }
}



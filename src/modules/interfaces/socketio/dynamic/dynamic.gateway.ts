import {
    OnGatewayInit, 
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from "@nestjs/websockets"
import {
    DynamicWebSocketGateway, 
    socketIoPrivyAuthMiddleware, 
    WsSuccessMessage
} from "@modules/socketio"
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
    AsyncService,
    InjectSuperJson
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    CacheKey,
    CacheService, 
    DynamicLiquidityPoolStateCacheResult
} from "@modules/cache"
import {
    SubscribeDynamicLiquidityPoolsInfoEventPayload,
    PublicationEvent,
    SubscriptionEvent,
} from "../config"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    SomeLiquidityPoolsNotFoundException 
} from "@exceptions"
import {
    WsTransformInterceptor, WsTransformService 
} from "@modules/socketio"
import {
    UseInterceptors 
} from "@nestjs/common"
import SuperJSON from "superjson"

@DynamicWebSocketGateway()
export class DynamicGateway implements OnGatewayInit, OnGatewayDisconnect {
    /**
     * Map of socket client id -> subscribed liquidity pool ids.
     *
     * We keep this in-memory because subscriptions are ephemeral and tied
     * to the socket connection lifecycle.
     */
    private readonly dynamicLiquidityPoolsInfoMap: Map<string, Array<string>> = new Map()
    constructor(
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly wsTransformService: WsTransformService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
        this.dynamicLiquidityPoolsInfoMap.set(
            client.id,
            data.ids
        )
    }

    handleDisconnect(client: TypedSocket) {
        // Cleanup subscription state to avoid memory leaks.
        this.dynamicLiquidityPoolsInfoMap.delete(client.id)
    }

    /**
     * Periodically fetch dynamic liquidity pool info from cache and publish
     * results to each subscribed client.
     *
     * Note: we resolve pool type implicitly by trying CLMM key first, then DLMM.
     */
    @Interval(envConfig().socketIo.dynamic.liquidityPoolsInfo.interval)
    async publishDynamicLiquidityPoolsInfo() {
        // 1) Build a unique set of pool ids requested by any connected client.
        const allSubscribedIds = new Set<string>()
        for (const ids of this.dynamicLiquidityPoolsInfoMap.values()) {
            for (const id of ids) {
                allSubscribedIds.add(id)
            }
        }
        // 2) Fetch latest dynamic info for each unique pool id (CLMM first, then DLMM).
        const resultsById: Record<string, DynamicLiquidityPoolStateCacheResult> = {
        }
        const promises: Array<Promise<void>> = Array.from(allSubscribedIds).map(
            async (liquidityPoolId) => {
                const clmm = await this.cacheService.get({
                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
                    args: [liquidityPoolId],
                })
                if (clmm) {
                    resultsById[liquidityPoolId] = clmm
                    return
                }
                const dlmm = await this.cacheService.get({
                    key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                    args: [liquidityPoolId],
                })
                if (dlmm) {
                    resultsById[liquidityPoolId] = dlmm
                }
            }
        )
        await this.asyncService.allIgnoreError(promises)

        // 3) Publish per-client subset.
        for (const [
            clientId,
            ids,
        ] of this.dynamicLiquidityPoolsInfoMap.entries()) {
            const client = this.server.sockets.get(clientId)
            if (!client) {
                continue
            }
            const results = ids
                .map((id) => resultsById[id])
                .filter(Boolean)
            this.wsTransformService.transformSuccess({
                message: "Dynamic liquidity pools info published successfully",
                data: results,
                client,
                eventName: PublicationEvent.DynamicLiquidityPoolsInfo,
            })
        }
    }
}
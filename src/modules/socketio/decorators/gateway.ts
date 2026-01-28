import {
    WebSocketGateway 
} from "@nestjs/websockets"
import {
    createCorsOptions 
} from "@modules/cors"

export const PRICE_NAMESPACE = "price"
export const DYNAMIC_LIQUIDITY_POOL_INFO_NAMESPACE = "dynamic-liquidity-pool-info"

export const PriceWebSocketGateway = () => WebSocketGateway(
    {
        namespace: PRICE_NAMESPACE,
        transports: ["websocket",
            "polling"],
        cors: createCorsOptions(),
        perMessageDeflate: true,
    }
)

export const DynamicLiquidityPoolInfoWebSocketGateway = () => WebSocketGateway(
    {
        namespace: DYNAMIC_LIQUIDITY_POOL_INFO_NAMESPACE,
        transports: ["websocket",
            "polling"],
        cors: createCorsOptions(),
        perMessageDeflate: true,
    })
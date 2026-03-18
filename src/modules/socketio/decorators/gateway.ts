import {
    WebSocketGateway 
} from "@nestjs/websockets"
import {
    createCorsOptions 
} from "@modules/cors"

export const PRICE_NAMESPACE = "price"
export const DYNAMIC_LIQUIDITY_POOL_INFO_NAMESPACE = "dynamic-liquidity-pool-info"
export const CALLBACK_NAMESPACE = "callback"
export const INDICATORS_NAMESPACE = "indicators"

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
    }
)

export const CallbackWebSocketGateway = () => WebSocketGateway(
    {
        namespace: CALLBACK_NAMESPACE,
        transports: ["websocket",
            "polling"],
        cors: createCorsOptions(),
        perMessageDeflate: true,
    }
)

export const IndicatorsWebSocketGateway = () => WebSocketGateway(
    {
        namespace: INDICATORS_NAMESPACE,
        transports: ["websocket",
            "polling"],
        cors: createCorsOptions(),
        perMessageDeflate: true,
    }
)
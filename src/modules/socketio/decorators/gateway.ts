import { WebSocketGateway } from "@nestjs/websockets"
import { createCorsOptions } from "@modules/cors"

export const PYTH_NAMESPACE = "pyth"
export const CORE_NAMESPACE = "core"
export const PythWebSocketGateway = () => WebSocketGateway(
    {
    // we use the namespace "PYTH"
        namespace: PYTH_NAMESPACE,
        // we allow both websocket and polling
        transports: ["websocket", "polling"],
        // we allow cors
        cors: createCorsOptions(),
        perMessageDeflate: true,
    })

export const CoreWebSocketGateway = () => WebSocketGateway(
    {
        namespace: CORE_NAMESPACE,
        transports: ["websocket", "polling"],
        cors: createCorsOptions(),
        perMessageDeflate: true,
    })

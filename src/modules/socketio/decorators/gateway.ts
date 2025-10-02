import { WebSocketGateway } from "@nestjs/websockets"
import { createCorsOptions } from "@modules/cors"

export const PYTH_NAMESPACE = "pyth"
export const PythWebSocketGateway = () => WebSocketGateway(
    {
    // we use the namespace "PYTH"
        namespace: PYTH_NAMESPACE,
        // we allow both websocket and polling
        transports: ["websocket", "polling"],
        // we allow cors
        cors: createCorsOptions(),
    })
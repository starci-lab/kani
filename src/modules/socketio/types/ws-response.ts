import type {
    TypedSocket
} from "./socket"
import type {
    AbstractException
} from "@modules/exceptions"

/** WebSocket response payload. */
export interface WsResponse<T = unknown> {
    success: boolean
    message: string
    data?: T
    error?: string
}

/** Params for sending a success or error WS response. */
export interface WsResponseParams<T = unknown> {
    message: string
    data?: T
    client: TypedSocket
    eventName: string
    success: boolean
    error?: AbstractException
}

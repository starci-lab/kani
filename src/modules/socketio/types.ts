import {
    Socket, DefaultEventsMap 
} from "socket.io"
export interface SocketData {
    // user id
    userId: string
}

// type for the socket
export type TypedSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>

export interface WsResponse<T = unknown> {
    success: boolean
    message: string
    data?: T
    error?: string
}
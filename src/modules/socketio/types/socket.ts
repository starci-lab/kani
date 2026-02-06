import type {
    DefaultEventsMap
} from "socket.io"
import type {
    Socket
} from "socket.io"
import type {
    SocketData
} from "./socket-data"

/** Socket.IO socket typed with SocketData. */
export type TypedSocket = Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    SocketData
>

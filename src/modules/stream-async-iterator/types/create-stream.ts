import type {
    StreamConnection
} from "./stream-connection"

/** Params for creating an async iterable stream from a connection. */
export interface CreateStreamParams<TData> {
    connection: StreamConnection<TData>
    signal?: AbortSignal
    onOpen?: (connection: StreamConnection<TData>) => Promise<void> | void
    onError?: (error: Error) => Promise<void> | void
    onClose?: () => Promise<void> | void
}

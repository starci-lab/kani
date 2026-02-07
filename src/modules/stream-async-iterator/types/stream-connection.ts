export interface StreamConnection<TData> {
    // Opens the connection (may perform async work like connect/subscribe)
    onOpen(handler: () => void | Promise<void>): Promise<void>
    // Registers a handler for incoming data events
    onData(handler: (data: TData) => void | Promise<void>): void
    // Registers a handler for error events
    onError(handler: (error: Error) => void | Promise<void>): void
    // Registers a handler for close events
    onClose(handler: () => void | Promise<void>): void
    // Closes the connection and releases resources
    close(): Promise<void>
}
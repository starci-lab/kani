// create the stream connection interface
export interface StreamConnection<TData> {
    // define the onOpen handler
    onOpen(handler: () => void): void
    // define the onData handler
    onData(handler: (data: TData) => void | Promise<void>): void
    // define the onError handler
    onError(handler: (error: Error) => void): void
    // define the onClose handler
    onClose(handler: () => void): void
    // define the close function
    close(): void
}
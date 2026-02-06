/** Stream connection interface: onOpen, onData, onError, onClose, close. */
export interface StreamConnection<TData> {
    onOpen(handler: () => void): void
    onData(handler: (data: TData) => void | Promise<void>): void
    onError(handler: (error: Error) => void): void
    onClose(handler: () => void): void
    close(): void
}

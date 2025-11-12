export abstract class AbstractException extends Error {
    readonly code: string
    readonly metadata?: Record<string, unknown>
    constructor(message: string, name: string, metadata?: Record<string, unknown>) {
        super(message)
        this.name = name
        this.metadata = metadata
    }
}
/**
 * Base abstract exception class for all custom exceptions
 * All exceptions in the application should extend this class
 */
export abstract class AbstractException extends Error {
    /** Unique error code for identification */
    readonly code: string
    /** Additional metadata for debugging */
    readonly metadata?: Record<string, unknown>

    constructor(message: string, name: string, metadata?: Record<string, unknown>) {
        super(message)
        this.name = name
        this.metadata = metadata
    }
}

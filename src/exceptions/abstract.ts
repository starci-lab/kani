/**
 * Base abstract exception class for all custom exceptions
 * All exceptions in the application should extend this class
 */
export abstract class AbstractException extends Error {
    /** Unique error code for identification */
    readonly code: string
    /** Additional metadata for debugging */
    readonly metadata?: Record<string, unknown>

    /**
     * @param message Human readable message
     * @param name Exception code (kept as `Error.name` for backward compatibility)
     * @param metadata Extra debugging metadata
     */
    constructor(message: string, name: string, metadata?: Record<string, unknown>) {
        super(message)
        this.code = name
        this.name = name
        this.metadata = metadata
    }
}


/** Additional metadata for the exception */
export interface AbstractExceptionMetadata {
    originalError?: Error
}
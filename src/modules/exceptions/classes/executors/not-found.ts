/**
 * Executor Exceptions
 * Errors related to executor service operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when executor cannot be found by ID */
export interface ExecutorNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class ExecutorNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: ExecutorNotFoundExceptionMetadata
    ) {
        super("Executor not found",
            "EXECUTOR_NOT_FOUND_EXCEPTION",
            {
                id,
                originalError,
            })
    }
}

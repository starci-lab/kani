/**
 * Executor exceptions.
 * Errors related to executor service operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when executor cannot be found by ID. */
export interface ExecutorNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}

/** Thrown when executor cannot be found by ID. */
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

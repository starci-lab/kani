/**
 * Executor Exceptions
 * Errors related to executor service operations
 */

import { AbstractException } from "../abstract"

/** Thrown when executor cannot be found by ID */
export class ExecutorNotFoundException extends AbstractException {
    constructor(executorId: string, message?: string) {
        super(message || `Executor with id ${executorId} not found`, "EXECUTOR_NOT_FOUND_EXCEPTION", { executorId })
    }
}

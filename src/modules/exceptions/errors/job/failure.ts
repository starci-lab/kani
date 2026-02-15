import type {
    AbstractExceptionMetadata,
} from "../abstract"
import {
    JobFailureStrategy,
} from "@modules/common"
import {
    AbstractException,
} from "../abstract"

/**
 * Metadata for job failure exception.
 */
export interface JobFailureExceptionMetadata extends AbstractExceptionMetadata {
    strategy: JobFailureStrategy
}

/**
 * Exception for job failure strategy.
 */
export class JobFailureException extends AbstractException {
    readonly strategy: JobFailureStrategy

    constructor(
        {
            originalError,
            strategy,
        }: JobFailureExceptionMetadata,
    ) {
        super(
            "Job failure exception",
            "JOB_FAILURE_EXCEPTION",
            {
                originalError,
                strategy,
            }
        )

        // set the failure strategy of the job failure exception
        this.strategy = strategy
    }
}
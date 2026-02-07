import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when wait condition is not met after all retries */
export interface WaitTimeoutExceptionMetadata extends AbstractExceptionMetadata {
    maxAttempts: number
}

/** Thrown when wait operation times out. */
export class WaitTimeoutException extends AbstractException {
    constructor(
        {
            maxAttempts,
            originalError,
        }: WaitTimeoutExceptionMetadata
    ) {
        super(
            "Wait condition not met after max attempts",
            "WAIT_TIMEOUT_EXCEPTION",
            {
                maxAttempts,
                originalError,
            },
        )
    }
}

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
/** Thrown when pool tokens are invalid */
export interface JobNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
}

/** Thrown when job cannot be found. */
export class JobNotFoundException extends AbstractException {
    constructor(
        { jobId, originalError }: JobNotFoundExceptionMetadata
    ) {
        super(
            "Job not found", 
            "JOB_NOT_FOUND_EXCEPTION", 
            {
                jobId,
                originalError,
            }
        )
    }
}
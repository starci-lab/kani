import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
/** Thrown when pool tokens are invalid */
export interface JobNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
}
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
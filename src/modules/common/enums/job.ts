/**
 * Enum of job failure strategies.
 * retry = Retryable (can retry the job)
 * requeue = Requeue (put job back to queue)
 * fatal = Fatal (unrecoverable, stop job)
 */
export enum JobFailureStrategy {
    Retry = "retry",
    Requeue = "requeue",
    Fatal = "fatal",
}
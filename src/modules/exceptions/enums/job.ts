/** Reason why open position job cannot be enqueued. */
export enum CannotOpenPositionEnqueueJobReason {
    AlreadyInQueue = "alreadyInQueue",
    RuntimeError = "runtimeError",
}

/** Reason why reconcile balance job cannot be enqueued. */
export enum CannotReconcileBalanceEnqueueJobReason {
    AlreadyInQueue = "alreadyInQueue",
    RuntimeError = "runtimeError",
}

/** Reason why close position job cannot be enqueued. */
export enum CannotClosePositionEnqueueJobReason {
    CannotSettlePosition = "cannotSettlePosition",
    AlreadyInQueue = "alreadyInQueue",
    RuntimeError = "runtimeError",
}

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
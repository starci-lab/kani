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
 * 1 = Retryable (can retry the job)
 * 2 = Requeue (put job back to queue)
 * 3 = Fatal (unrecoverable, stop job)
 */
export enum JobFailureStrategy {
    Retry = 1,
    Requeue = 2,
    Fatal = 3,
  }
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
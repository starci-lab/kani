/**
 * Enum of BullMQ queue names used across the system.
 * Each name corresponds to a specific type of background job queue.
 */
export enum BullQueueName {
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
    ReconcileBalance = "reconcileBalance",
}

/**
 * Standardized configuration structure for a BullMQ queue.
 */
export interface BullQueueData {
    /** The actual queue name used in BullMQ. */
    name: string
    /** The prefix for the queue. */
    prefix: string
}

/**
 * Options for registering a BullMQ queue.
 */
export interface RegisterQueueOptions {
    queueName?: BullQueueName
    isGlobal?: boolean
}

export enum JobDecision {
    Retry = "Retry",
    Cancel = "Cancel",
  }
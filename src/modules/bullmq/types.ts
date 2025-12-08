import { BulkJobOptions } from "bullmq"

/**
 * Enum of BullMQ queue names used across the system.
 * Each name corresponds to a specific type of background job queue.
 */
export enum BullQueueName {
    OpenPositionConfirmation = "openPositionConfirmation",
    ClosePositionConfirmation = "closePositionConfirmation",
    SwapConfirmation = "swapConfirmation",
}

/**
 * Standardized configuration structure for a BullMQ queue.
 */
export interface BullQueueData {
    /** The actual queue name used in BullMQ. */
    name: string

    /** Number of jobs that can be processed in a single batch. */
    batchSize: number

    /** Optional prefix to namespace queue keys in Redis. */
    prefix?: string

    /** Optional BullMQ bulk job configuration (cleanup, retry, etc). */
    opts?: BulkJobOptions
}

/**
 * Options for registering a BullMQ queue.
 */
export interface RegisterQueueOptions {
    queueName?: BullQueueName
    isGlobal?: boolean
}
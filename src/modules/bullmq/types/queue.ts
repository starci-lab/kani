import type {
    BullQueueName 
} from "../enums"

/** Standardized configuration structure for a BullMQ queue (name and prefix). */
export interface BullQueueData {
    /** The actual queue name used in BullMQ. */
    name: string
    /** The prefix for the queue (e.g. for Redis keys). */
    prefix: string
}

/** Options for registering a BullMQ queue (queue name and global scope). */
export interface RegisterQueueOptions {
    queueName?: BullQueueName
    isGlobal?: boolean
}

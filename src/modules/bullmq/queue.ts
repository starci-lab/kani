import { BullQueueData, BullQueueName } from "./types"
import { formatWithBraces } from "./utils"

/**
 * Centralized configuration for all BullMQ queues.
 * Each queue has its own prefix, batch size, and cleanup policies.
 */
export const bullData: Record<BullQueueName, BullQueueData> = {
    [BullQueueName.OpenPositionConfirmation]: {
        // Prefix for Redis keys to keep liquidity pool jobs organized and isolated
        prefix: formatWithBraces("open_position_confirmation"),

        // Queue name used internally by BullMQ
        name: "open_position_confirmation",

        // Max number of jobs processed per batch in this queue
        batchSize: 1000,

        // BullMQ cleanup policy and other job options
        opts: {
            // Automatically remove completed jobs to keep the queue clean
            removeOnComplete: true,
            // Store failed jobs to analyze and improve the bot
            removeOnFail: true,
            // Retry the job up to 10 times if it fails
            attempts: 10,
            // Delay between retries in milliseconds
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        },
    },
    [BullQueueName.ClosePositionConfirmation]: {
        prefix: formatWithBraces("close_position_confirmation"),
        name: "close_position_confirmation",
        batchSize: 1000,
        opts: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 10,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        },
    },
    [BullQueueName.SwapConfirmation]: {
        prefix: formatWithBraces("swap_confirmations"),
        name: "swap_confirmation",
        batchSize: 1000,
        opts: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 10,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        },
    },
}
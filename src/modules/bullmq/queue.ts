import { envConfig } from "@modules/env"
import { BullQueueData, BullQueueName } from "./types"
import Decimal from "decimal.js"
import { formatWithBraces } from "./utils"

/**
 * Centralized configuration for all BullMQ queues.
 * Each queue has its own prefix, batch size, and cleanup policies.
 */
export const bullData: Record<BullQueueName, BullQueueData> = {
    [BullQueueName.LiquidityPools]: {
        // Prefix for Redis keys to keep liquidity pool jobs organized and isolated
        prefix: formatWithBraces("liquidity_pools"),

        // Queue name used internally by BullMQ
        name: "liquidity_pools",

        // Max number of jobs processed per batch in this queue
        batchSize: 1000,

        // BullMQ cleanup policy and other job options
        opts: {
            // Automatically remove completed jobs after reaching the configured limit
            removeOnComplete: {
                // Age is computed from job count divided by 1000 for rough cleanup pacing
                age: new Decimal(envConfig().bullmq.completedJobCount)
                    .div(1000)
                    .toNumber(),
                count: envConfig().bullmq.completedJobCount,
            },

            // Automatically remove failed jobs after reaching the configured limit
            removeOnFail: {
                age: new Decimal(envConfig().bullmq.failedJobCount)
                    .div(1000)
                    .toNumber(),
                count: envConfig().bullmq.failedJobCount,
            },
        },
    },
}
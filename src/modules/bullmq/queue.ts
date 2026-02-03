import {
    createHash
} from "@modules/utils"
import {
    BullQueueData, BullQueueName
} from "./types"
import {
    formatWithBraces
} from "./utils"
import {
    envConfig
} from "@modules/env"

/**
 * Centralized configuration for all BullMQ queues.
 * Each queue has its own prefix, batch size, and cleanup policies.
 */
export const bullData: Record<BullQueueName, BullQueueData> = {
    [BullQueueName.OpenPosition]: {
        // Prefix for Redis keys to keep liquidity pool jobs organized and isolated
        prefix: formatWithBraces(createHash("open_position",
            envConfig().executor.id)),
        // Queue name used internally by BullMQ
        name: createHash("open_position",
            envConfig().executor.id),
    },
    [BullQueueName.ClosePosition]: {
        prefix: formatWithBraces(createHash("close_position",
            envConfig().executor.id)),
        name: createHash("close_position",
            envConfig().executor.id),
    },
    [BullQueueName.ReconcileBalance]: {
        prefix: formatWithBraces(createHash("reconcile_balance",
            envConfig().executor.id)),
        name: createHash("reconcile_balance",
            envConfig().executor.id),
    }
}
import { BullQueueData, BullQueueName } from "./types"
import { formatWithBraces } from "./utils"

/**
 * Centralized configuration for all BullMQ queues.
 * Each queue has its own prefix, batch size, and cleanup policies.
 */
export const bullData: Record<BullQueueName, BullQueueData> = {
    [BullQueueName.OpenPosition]: {
        // Prefix for Redis keys to keep liquidity pool jobs organized and isolated
        prefix: formatWithBraces("open_position"),
        // Queue name used internally by BullMQ
        name: "open_position",
    },
    [BullQueueName.ClosePosition]: {
        prefix: formatWithBraces("close_position"),
        name: "close_position",
    },
    [BullQueueName.ReconcileBalance]: {
        prefix: formatWithBraces("reconcile_balance"),
        name: "reconcile_balance",
    }
}
import {
    envConfig 
} from "@modules/env"
import type {
    BullQueueData 
} from "../types"
import {
    BullQueueName 
} from "../enums"

/**
 * Wraps a string in braces for use as a Redis key prefix.
 *
 * @param prefix - Raw prefix string
 * @returns Formatted string like "{prefix}"
 */
export function formatWithBraces(prefix: string): string {
    return `{${prefix}}`
}

/**
 * Centralized configuration for all BullMQ queues.
 * Each queue has its own prefix and name derived from executor id.
 */
export const bullData: Record<BullQueueName, BullQueueData> = {
    [BullQueueName.OpenPosition]: {
        prefix: formatWithBraces(
            `open_position:${envConfig().executor.id}`,
        ),
        name: `open_position-${envConfig().executor.id}`,
    },
    [BullQueueName.ClosePosition]: {
        prefix: formatWithBraces(
            `close_position-${envConfig().executor.id}`
        ),
        name: `close_position-${envConfig().executor.id}`,
    },
    [BullQueueName.ReconcileBalance]: {
        prefix: formatWithBraces(
            `reconcile_balance-${envConfig().executor.id}`
        ),
        name: `reconcile_balance-${envConfig().executor.id}`,
    },
    [BullQueueName.Withdraw]: {
        prefix: formatWithBraces(
            `withdraw-${envConfig().executor.id}`
        ),
        name: `withdraw-${envConfig().executor.id}`,
    },
}

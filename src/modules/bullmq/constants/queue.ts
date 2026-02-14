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
    [BullQueueName.Action]: {
        prefix: formatWithBraces(
            `action-${envConfig().executor.id}`
        ),
        name: `action-${envConfig().executor.id}`,
    },
}

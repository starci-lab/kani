import {
    createHash
} from "crypto"
import type {
    GetReadinessWatcherNameParams
} from "../types"

/**
 * Build a stable name for a readiness watcher from name and params (hashed).
 */
export const createReadinessWatcherName = (
    params: GetReadinessWatcherNameParams,
): string => {
    const { name, params: record } = params
    return createHash("sha256")
        .update(JSON.stringify({
            name, params: record 
        }))
        .digest("hex")
}

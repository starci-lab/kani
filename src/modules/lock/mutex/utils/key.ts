import {
    createHash
} from "crypto"
import type {
    MutexKey
} from "../enums"

/** Params for building a mutex key string. */
export interface GetMutexKeyParams {
    key: MutexKey
    args?: Array<unknown>
}

/**
 * Build a stable string key for a mutex from key kind and optional args (hashed).
 */
export const getMutexKey = (params: GetMutexKeyParams): string => {
    const { key, args = [] } = params
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}

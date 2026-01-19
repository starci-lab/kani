/**
 * Cache Exceptions
 * Errors related to cache operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when executor cannot be found by ID */
export interface CacheStaleExceptionMetadata extends AbstractExceptionMetadata {
    key: string
    args: Record<string, unknown>
}
export class CacheStaleException extends AbstractException {
    constructor(
        { key, originalError }: CacheStaleExceptionMetadata
    ) {
        super("Cache stale",
            "CACHE_STALE_EXCEPTION",
            {
                key,
                originalError,
            })
    }
}

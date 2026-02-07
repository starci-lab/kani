/**
 * Cache exceptions.
 * Errors related to cache operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when cache is stale. */
export interface CacheStaleExceptionMetadata extends AbstractExceptionMetadata {
    key: string
    args: Record<string, unknown>
}

/** Thrown when cache entry is stale. */
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

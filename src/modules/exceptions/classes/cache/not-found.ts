import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

export interface CacheNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    key: string
    args: Array<string>
}
export class CacheNotFoundException extends AbstractException {
    constructor(
        { key, args, originalError }: CacheNotFoundExceptionMetadata
    ) {
        super("Cache not found",
            "CACHE_NOT_FOUND_EXCEPTION",
            {
                key,
                args,
                originalError,
            }
        )
    }
}
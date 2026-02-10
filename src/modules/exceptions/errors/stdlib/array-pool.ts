/**
 * Typed array pool allocation failed exception.
 */
import {
    AbstractException, 
    AbstractExceptionMetadata
} from "../abstract"

/**
 * Typed array pool allocation failed exception metadata.
 */
export interface TypedArrayPoolAllocationFailedExceptionMetadata extends AbstractExceptionMetadata {
    n: number
    m: number
}

/**
 * Typed array pool allocation failed exception.
 */
export class TypedArrayPoolAllocationFailedException extends AbstractException {
    constructor(
        { n, m }: TypedArrayPoolAllocationFailedExceptionMetadata
    ) {
        super(
            "Typed array pool allocation failed",
            "TYPED_ARRAY_POOL_ALLOCATION_FAILED_EXCEPTION",
            {
                n, m 
            }
        )
    }
}
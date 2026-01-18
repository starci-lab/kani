/**
 * Aggregator Exceptions
 * Errors related to DEX aggregator operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when an aggregator cannot be found */
export interface AggregatorNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: string
}
export class AggregatorNotFoundException extends AbstractException {
    constructor(
        { id, displayId, originalError }: AggregatorNotFoundExceptionMetadata
    ) {
        super(
            "Aggregator not found",
            "AGGREGATOR_NOT_FOUND_EXCEPTION",
            {
                id, displayId, originalError 
            }
        )
    }
}

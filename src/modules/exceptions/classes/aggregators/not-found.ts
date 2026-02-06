/**
 * Aggregator Exceptions
 * Errors related to DEX aggregator operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import type {
    AggregatorId 
} from "@modules/blockchains"

/** Thrown when an aggregator cannot be found */
export interface AggregatorAllQuotesFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorIds: Array<AggregatorId>
}
export class AggregatorAllQuotesFailedException extends AbstractException {
    constructor(
        { aggregatorIds, originalError }: AggregatorAllQuotesFailedExceptionMetadata
    ) {
        super(
            "Aggregator all quotes failed",
            "AGGREGATOR_ALL_QUOTES_FAILED_EXCEPTION",
            {
                aggregatorIds,
                originalError,
            }
        )
    }
}

/** Thrown when an aggregator is not implemented */
export interface AggregatorNotImplementedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}
export class AggregatorNotImplementedException extends AbstractException {
    constructor(
        { aggregatorId }: AggregatorNotImplementedExceptionMetadata
    ) {
        super("Aggregator not implemented",
            "AGGREGATOR_NOT_IMPLEMENTED_EXCEPTION",
            {
                aggregatorId,
            }
        )
    }
}
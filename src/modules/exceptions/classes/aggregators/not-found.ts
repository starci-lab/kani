/**
 * Aggregator exceptions.
 * Errors related to DEX aggregator operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    AggregatorId 
} from "@modules/common"

/** Metadata when an aggregator cannot be found or is not implemented. */
export interface AggregatorAllQuotesFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorIds: Array<AggregatorId>
}

/** Thrown when all aggregator quotes failed. */
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

/** Metadata when an aggregator is not implemented. */
export interface AggregatorNotImplementedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}

/** Thrown when an aggregator is not implemented. */
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
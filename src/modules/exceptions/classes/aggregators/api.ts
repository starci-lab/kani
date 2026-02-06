import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    AggregatorId 
} from "@modules/common"

/** Metadata when an aggregator quote error occurs. */
export interface AggregatorQuoteFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}

/** Thrown when an aggregator quote error occurs. */
export class AggregatorQuoteFailedException extends AbstractException {
    constructor(
        { aggregatorId, originalError }: AggregatorQuoteFailedExceptionMetadata
    ) {
        super("Aggregator quote failed",
            "AGGREGATOR_QUOTE_FAILED_EXCEPTION",
            {
                aggregatorId,
                originalError,
            }
        )
    }
}

/** Metadata when an aggregator swap error occurs. */
export interface AggregatorSwapFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}

/** Thrown when an aggregator swap error occurs. */
export class AggregatorSwapFailedException extends AbstractException {
    constructor(
        { aggregatorId, originalError }: AggregatorSwapFailedExceptionMetadata
    ) {
        super("Aggregator swap failed",
            "AGGREGATOR_SWAP_FAILED_EXCEPTION",
            {
                aggregatorId, originalError,
            })
    }
}
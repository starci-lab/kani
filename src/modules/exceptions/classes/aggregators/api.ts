import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    AggregatorId 
} from "@modules/typedefs"

/** Thrown when an aggregator quote error occurs */
export interface AggregatorQuoteFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}
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

/** Thrown when an aggregator swap error occurs */
export interface AggregatorSwapFailedExceptionMetadata extends AbstractExceptionMetadata {
    aggregatorId: AggregatorId
}
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
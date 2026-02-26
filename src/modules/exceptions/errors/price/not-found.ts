import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
/** Thrown when oracle token price is not found */
export interface AggregatedTokenPriceNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class AggregatedTokenPriceNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: AggregatedTokenPriceNotFoundExceptionMetadata
    ) {
        super(
            "Aggregated token price not found",
            "AGGREGATED_TOKEN_PRICE_NOT_FOUND_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}
/** Thrown when aggregated token price array is not found */
export interface AggregatedTokenPriceArrayNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class AggregatedTokenPriceArrayNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: AggregatedTokenPriceArrayNotFoundExceptionMetadata
    ) {
        super(
            "Aggregated token price array not found",
            "AGGREGATED_TOKEN_PRICE_ARRAY_NOT_FOUND_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}
/** Thrown when aggregated token price cummulative is not found */
export interface AggregatedTokenPriceCummulativeNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class AggregatedTokenPriceCummulativeNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: AggregatedTokenPriceCummulativeNotFoundExceptionMetadata
    ) {
        super(
            "Aggregated token price cummulative not found",
            "AGGREGATED_TOKEN_PRICE_CUMMULATIVE_NOT_FOUND_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}

/** Thrown when price by market priority could not be resolved (no usable market price). */
export interface PriceByMarketPriorityNotResolvedExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class PriceByMarketPriorityNotResolvedException extends AbstractException {
    constructor(
        { id, originalError }: PriceByMarketPriorityNotResolvedExceptionMetadata
    ) {
        super(
            "Price by market priority could not be resolved",
            "PRICE_BY_MARKET_PRIORITY_NOT_RESOLVED_EXCEPTION",
            {
                id,
                originalError,
            }
        )
    }
}
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
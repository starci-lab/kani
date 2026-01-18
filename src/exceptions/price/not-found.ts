import {
    TokenId 
} from "@modules/databases"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when oracle token price is not found */
export interface AggregatedTokenPriceNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    tokenId: TokenId
}
export class AggregatedTokenPriceNotFoundException extends AbstractException {
    constructor(
        { tokenId, originalError }: AggregatedTokenPriceNotFoundExceptionMetadata
    ) {
        super(
            "Oracle token price not found",
            "ORACLE_TOKEN_PRICE_NOT_FOUND_EXCEPTION",
            {
                tokenId,
                originalError,
            }
        )
    }
}
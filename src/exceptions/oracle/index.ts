import { AbstractException } from "@exceptions"
import { TokenId } from "@modules/databases"

/** Thrown when oracle token price is not found */
export class AggregatedTokenPriceNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Oracle token price not found", "ORACLE_TOKEN_PRICE_NOT_FOUND_EXCEPTION", { tokenId })
    }
}
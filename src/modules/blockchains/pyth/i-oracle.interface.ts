import { TokenId } from "@modules/databases"
import { Decimal } from "decimal.js"

export interface IOracleService {
    initialize(
        tokens: Array<TokenId>
    ): void;
    getPrices(
        tokenIds: Array<TokenId>
    ): Promise<Partial<Record<TokenId, Decimal>>>;
}

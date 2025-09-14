import { TokenId, TokenLike } from "@modules/databases"
import { Decimal } from "decimal.js"

export interface IOracleService {
    initialize(
        tokens: Array<TokenLike>
    ): void;
    getPrices(
        tokenIds: Array<TokenId>
    ): Promise<Partial<Record<TokenId, Decimal>>>;
    subscribe(): void;
}

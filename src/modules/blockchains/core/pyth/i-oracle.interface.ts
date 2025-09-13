import { TokenId, TokenLike } from "@modules/databases"
import { Decimal } from "decimal.js"

export interface IOracleService {
    fetchPrices(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>,
    ): Promise<Partial<Record<TokenId, Decimal>>>;
}

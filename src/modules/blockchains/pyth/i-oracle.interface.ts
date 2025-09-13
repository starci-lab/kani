import { TokenId } from "@modules/databases"
import { Decimal } from "decimal.js"

export interface IOracleService {
    fetchPrices(
        tokenIds: Array<TokenId>,
    ): Promise<Partial<Record<TokenId, Decimal>>>;
}

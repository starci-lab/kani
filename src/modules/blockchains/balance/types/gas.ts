import {
    TokenId 
} from "@modules/databases"

/** Parameters for getting gas status. */
export interface GetGasStatusParams {
    /** Token being traded / bought */
    targetTokenId: TokenId
    /** Token used to quote the price */
    quoteTokenId: TokenId
}

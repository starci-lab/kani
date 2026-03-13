import {
    TokenSchema 
} from "@modules/databases"

/** Parameters for getting gas status. */
export interface GetGasStatusParams {
    /** Token being traded / bought */
    targetToken: TokenSchema
    /** Token used to quote the price */
    quoteToken: TokenSchema
}

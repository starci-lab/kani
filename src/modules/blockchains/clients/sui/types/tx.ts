import {
    BotSchema, 
    TransactionType
} from "@modules/databases"
import {
    PrepareTx 
} from "../../../types"
import {
    LiquidityPoolSchema 
} from "@modules/databases"

/**
 * Parameters for building a Sui transaction.
 */
export interface SignSuiTxParams {
    /** Bot schema. */
    bot: BotSchema
    /** Prepared transaction. */
    prepareTx: PrepareTx
    /** Liquidity pool. */
    liquidityPool?: LiquidityPoolSchema
    /** Transaction type. */
    transactionType: TransactionType
}
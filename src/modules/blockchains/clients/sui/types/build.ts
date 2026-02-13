import {
    BotSchema 
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"

/**
 * Parameters for building a Sui transaction.
 */
export interface SignSuiTransactionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Transaction to sign. */
    tx: Transaction
}
import {
    BotSchema 
} from "@modules/databases"
import {
    PrepareTx 
} from "../../../types"

/**
 * Parameters for building a Sui transaction.
 */
export interface SignSuiTransactionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Prepared transaction. */
    prepareTx: PrepareTx
}
import {
    BotSchema,
} from "@modules/databases"
import BN from "bn.js"
import {
    PrepareTx,
} from "../../types"

/** Parameters for preparing a transfer fees transaction. */
export interface PrepareTransferFeesTransactionParams {
    /** Bot. */
    bot: BotSchema
    /** Fee amount transferred (target token, raw). */
    feeAmountTarget: BN
    /** Fee amount transferred (quote token, raw). */
    feeAmountQuote: BN
}

/** Result of preparing a transfer fees transaction. */
export interface PrepareTransferFeesTransactionResult {
    /** Transactions to prepare. */
    prepareTxs: Array<PrepareTx>
    /** Fee amount transferred (target token, raw). */
    feeAmountTarget: BN
    /** Fee amount transferred (quote token, raw). */
    feeAmountQuote: BN
}

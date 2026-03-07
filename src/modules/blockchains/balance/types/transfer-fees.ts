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
    /** Current target token balance amount (raw). */
    currentTargetBalanceAmount: BN
}

/** Result of preparing a transfer fees transaction. */
export interface PrepareTransferFeesTransactionResult {
    prepareTxs: Array<PrepareTx>
    /** Fee amount transferred (target token, raw). */
    feeAmount: BN
}

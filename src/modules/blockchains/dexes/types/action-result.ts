import {
    CoinArgument
} from "../../types"

/**
 * Result of a DEX action execution.
 * Contains transaction hash if executed and output coin information.
 */
export interface ActionResult {
    /** Transaction hash returned if the transaction is executed. */
    txHash?: string
    /** Output coin information. */
    coinOut?: CoinArgument
}

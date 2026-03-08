import type {
    ClientSession,
} from "mongoose"
import type BN from "bn.js"

/** Params for updating a position and bot after transfer-fees are executed. */
export interface UpdateTransferFeesRecordParams {
    /** Bot id (to clear activePosition). */
    botId: string
    /** Position id (to update fees). */
    positionId: string
    /** Fee amount in target token (raw string). */
    feeTargetAmount: BN
    /** Fee amount in quote token (raw string), typically "0". */
    feeQuoteAmount: BN
    /** Transaction hashes of the fee transfer(s). */
    feeTransferTxHashes: Array<string>
    /** Optional session for transactional update. */
    session?: ClientSession
}

/** Result of updating transfer-fees record (no payload). */
export type UpdateTransferFeesRecordResult = void

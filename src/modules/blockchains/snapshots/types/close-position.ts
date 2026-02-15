import type {
    ClientSession 
} from "mongoose"
import type {
    TokenSchema,
    BotSchema 
} from "@modules/databases"
import type {
    BalanceSnapshotParams 
} from "./balance"

/** Params for updating a close-position record with before/after balances. */
export interface UpdateClosePositionRecordParams {
    bot: BotSchema
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    positionId: string
    closeTxHashes: Array<string>
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
}

/** Result of updating a close-position record (no payload). */
export type UpdateClosePositionRecordResult = void

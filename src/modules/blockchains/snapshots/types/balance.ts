import type {
    ClientSession 
} from "mongoose"
import type BN from "bn.js"
import type {
    BotSchema 
} from "@modules/databases"

/** Balance amounts for a snapshot (target, quote, gas, optional incentives). */
export interface BalanceSnapshotParams {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts?: Record<string, BN>
}

/** Params for updating a bot's snapshot balance record. */
export interface UpdateBotSnapshotBalancesRecordParams {
    bot: BotSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts?: Record<string, BN>
    session?: ClientSession
}

/** Result of updating bot snapshot balances (no payload). */
export type UpdateBotSnapshotBalancesRecordResult = void

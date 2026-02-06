import {
    BotSchema
} from "@modules/databases"
import Decimal from "decimal.js"
import {
    BalanceEvalStatus
} from "../enums/balance-eval-status"

/**
 * Parameters for evaluating bot balance.
 */
export interface EvalBalanceParams {
    bot: BotSchema
}

/**
 * Funding snapshot containing amounts excluding and including gas.
 */
export interface FundingSnapshot {
    excludingGas: Decimal
    includingGas: Decimal
}

/**
 * Result of balance evaluation.
 */
export interface EvalBalanceResult {
    /** Funding snapshot in target token units. */
    fundingSnapsot: FundingSnapshot
    /** Funding snapshot in USD. */
    fundingSnapshotInUsd: FundingSnapshot
    /** Balance evaluation status. */
    status: BalanceEvalStatus
}

import {
    BotSchema, 
} from "@modules/databases"
import BN from "bn.js"
import {
    PrepareTx
} from "../../types"
import {
    SwapStep,
    ComputeQuoteRatioResult
} from "../../math"
import {
    BalanceReconcileBalanceTokenInput
} from "./balance"

/** Parameters for preparing a reconcile balance transaction. */
export interface PrepareReconcileBalanceTransactionParams {
    bot: BotSchema
    tokenInputs: Array<BalanceReconcileBalanceTokenInput>
}

/** Result of preparing a reconcile balance transaction. */
export interface PrepareReconcileBalanceTransactionResult {
    prepareTxs: Array<PrepareTx>
}

/** Parameters for executing a reconcile balance transaction. */
export interface ExecuteReconcileBalanceTransactionParams {
    bot: BotSchema
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

/** Result of executing a reconcile balance transaction. */
export interface ExecuteReconcileBalanceTransactionResult {
    txHashes: Array<string>
}

/** Parameters for enqueuing a reconcile balance job. */
export interface EnqueueReconcileBalanceParams {
    bot: BotSchema
    jobId: string
    isRetry?: boolean
}

/** Parameters for determining a reconcile balance plan. */
export interface DetermineReconcileBalancePlanParams {
    bot: BotSchema
    // if you pass those params, we will not fetch the balances from on-chain
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}

/** Result of determining a reconcile balance plan. */
export interface DetermineReconcileBalancePlanResult {
    swapSteps: Array<SwapStep>
    quoteRatioResult: ComputeQuoteRatioResult
}

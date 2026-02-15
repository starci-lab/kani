import {
    BotSchema,
    JobSchema, 
} from "@modules/databases"
import BN from "bn.js"
import {
    PrepareTx,
    SignedTx
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
    signedTx: SignedTx
    txCheck?: boolean
    stimulate?: boolean
}

/** Result of executing a reconcile balance transaction. */
export interface ExecuteReconcileBalanceTransactionResult {
    txHash: string
}

/** Parameters for enqueuing a reconcile balance job. */
export interface EnqueueReconcileBalanceParams {
    bot: BotSchema
    oldJob?: JobSchema
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

/** Parameters for signing a reconcile balance transaction. */
export interface SignReconcileBalanceTransactionParams {
    bot: BotSchema
    prepareTx: PrepareTx
}

/** Result of signing a reconcile balance transaction. */
export interface SignReconcileBalanceTransactionResult {
    signedTx: SignedTx
}
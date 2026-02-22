import {
    BotSchema, 
    JobSchema,
} from "@modules/databases"
import {
    PrepareTx,
    SignedTx,
    WithdrawTokenOutput
} from "../../types"
import {
    BalanceWithdrawTokenInput
} from "./balance"

/** Parameters for preparing a withdraw transaction. */
export interface PrepareWithdrawTransactionParams {
    bot: BotSchema
    tokenInputs: Array<BalanceWithdrawTokenInput>
    toAddress: string
    toUsdc?: boolean
}

/** Result of preparing a withdraw transaction. */
export interface PrepareWithdrawTransactionResult {
    prepareTxs: Array<PrepareTx>
    tokenOutputs: Array<WithdrawTokenOutput>
}

/** Parameters for executing a withdraw transaction. */
export interface ExecuteWithdrawTransactionParams {
    bot: BotSchema
    signedTx: SignedTx
    txCheck?: boolean
    stimulate?: boolean
}

/** Result of executing a withdraw transaction. */
export interface ExecuteWithdrawTransactionResult {
    txHash: string
}

/** Parameters for enqueuing a withdraw job. */
export interface EnqueueWithdrawParams {
    bot: BotSchema
    oldJob?: JobSchema
    isRetry?: boolean
}

/** Parameters for signing a withdraw transaction. */
export interface SignWithdrawTransactionParams {
    bot: BotSchema
    prepareTx: PrepareTx
}

/** Result of signing a withdraw transaction. */
export interface SignWithdrawTransactionResult {
    signedTx: SignedTx
}
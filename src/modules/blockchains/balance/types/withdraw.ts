import {
    BotSchema, 
} from "@modules/databases"
import {
    PrepareTx,
    SignedTx
} from "../../types"
import {
    WithdrawCacheResult 
} from "@modules/cache"
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
}

/** Parameters for executing a withdraw transaction. */
export interface ExecuteWithdrawTransactionParams {
    bot: BotSchema
    signedTx: SignedTx
    isRetry?: boolean
    stimulate?: boolean
}

/** Result of executing a withdraw transaction. */
export interface ExecuteWithdrawTransactionResult {
    txHash: string
}

/** Parameters for enqueuing a withdraw job. */
export interface EnqueueWithdrawParams {
    bot: BotSchema
    jobId: string
    isRetry?: boolean
    payload: WithdrawCacheResult
}

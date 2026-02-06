import {
    BotSchema, 
} from "@modules/databases"
import {
    PrepareTx
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
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

/** Result of executing a withdraw transaction. */
export interface ExecuteWithdrawTransactionResult {
    txHashes: Array<string>
}

/** Parameters for enqueuing a withdraw job. */
export interface EnqueueWithdrawParams {
    bot: BotSchema
    jobId: string
    isRetry?: boolean
    payload: WithdrawCacheResult
}

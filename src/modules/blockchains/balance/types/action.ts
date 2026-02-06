import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResults,
} from "./reconcile"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "./withdraw"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchBalancesParams,
    FetchBalancesResult,
    FetchTokensParams,
    FetchTokensResult,
} from "./fetcher"
import {
    EnqueueReconcileBalanceParams
} from "./reconcile"
import {
    EnqueueWithdrawParams
} from "./withdraw"
import {
    Job
} from "bullmq"

/**
 * Core interface for balance action operations.
 */
export interface IBalanceActionService {
    prepareReconcileBalanceTransaction(params: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult>
    executeReconcileBalanceTransaction(params: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResults>
    prepareWithdrawTransaction(params: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult>
    executeWithdrawTransaction(params: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult>
}

/**
 * Core interface for balance fetcher operations.
 */
export interface IBalanceFetcherService {
    fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResult>
    fetchBalances(params: FetchBalancesParams): Promise<FetchBalancesResult>
    fetchTokens(params: FetchTokensParams): Promise<FetchTokensResult>
}

/**
 * Core interface for reconcile-balance enqueue operations.
 */
export interface IReconcileBalanceEnqueueService {
    enqueue(params: EnqueueReconcileBalanceParams): Promise<Job<string>>
}

/**
 * Core interface for withdraw enqueue operations.
 */
export interface IWithdrawEnqueueService {
    enqueue(params: EnqueueWithdrawParams): Promise<Job<string>>
}

import type {
    BalanceAmounts,
} from "@modules/common"
import type {
    ExecuteReconcileBalanceTransactionResult,
    ComputeQuoteRatioResult,
    PrepareReconcileBalanceTransactionResult,
} from "@modules/blockchains"

/**
 * Data persisted/returned by reconcile-balance phases.
 *
 * - `reconcileBalanceTransaction` is produced by PREPARE and persisted on the Job document.
 * - `transactionRecords` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 * - `logging` is produced by PREPARE. Use for logging purposes.
 */
export interface ReconcileBalanceJobData {
    prepareResult: PrepareReconcileBalanceTransactionResult
    executeResult: ExecuteReconcileBalanceTransactionResult
    logging: {
        quoteRatioResult?: ComputeQuoteRatioResult
        balanceAmounts: BalanceAmounts
    }
}

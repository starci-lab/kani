import {
    Injectable 
} from "@nestjs/common"
import {
    IBalanceActionService,
} from "../types"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResult,
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    SuiReconcileBalanceActionService
} from "./reconcile-balance-action.service"
import {
    SuiWithdrawActionService
} from "./withdraw-action.service"

/**
 * Service responsible for Sui balance action operations.
 * Delegates to chain-specific reconcile balance and withdraw action services.
 *
 * @example
 * const service = new SuiBalanceService(...)
 * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
 */
@Injectable()
export class SuiBalanceService implements IBalanceActionService {
    constructor(
        private readonly suiReconcileBalanceActionService: SuiReconcileBalanceActionService,
        private readonly suiWithdrawActionService: SuiWithdrawActionService,
    ) {}

    /**
     * Prepares a reconcile balance transaction for Sui.
     *
     * @param param - Parameters for preparing reconcile balance transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
     */
    public async prepareReconcileBalanceTransaction(
        param: PrepareReconcileBalanceTransactionParams
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        return await this.suiReconcileBalanceActionService.prepare(param)
    }

    /**
     * Executes a reconcile balance transaction for Sui.
     *
     * @param param - Parameters for executing reconcile balance transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeReconcileBalanceTransaction({ bot, prepareTxs })
     */
    public async executeReconcileBalanceTransaction(
        param: ExecuteReconcileBalanceTransactionParams
    ): Promise<ExecuteReconcileBalanceTransactionResult> {
        return await this.suiReconcileBalanceActionService.execute(param)
    }

    /**
     * Prepares a withdraw transaction for Sui.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareWithdrawTransaction({ bot, tokenInputs, toAddress })
     */
    public async prepareWithdrawTransaction(
        param: PrepareWithdrawTransactionParams
    ): Promise<PrepareWithdrawTransactionResult> {
        return await this.suiWithdrawActionService.prepare(param)
    }

    /**
     * Executes a withdraw transaction for Sui.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeWithdrawTransaction({ bot, prepareTxs })
     */
    public async executeWithdrawTransaction(
        param: ExecuteWithdrawTransactionParams
    ): Promise<ExecuteWithdrawTransactionResult> {
        return await this.suiWithdrawActionService.execute(param)
    }
}
   
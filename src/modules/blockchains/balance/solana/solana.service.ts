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
    ExecuteReconcileBalanceTransactionResults,
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    SolanaReconcileBalanceActionService
} from "./reconcile-balance-action.service"
import {
    SolanaWithdrawActionService
} from "./withdraw-action.service"

/**
 * Service responsible for Solana balance action operations.
 * Delegates to chain-specific reconcile balance and withdraw action services.
 *
 * @example
 * const service = new SolanaBalanceService(...)
 * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
 */
@Injectable()
export class SolanaBalanceService implements IBalanceActionService {
    constructor(
        private readonly solanaReconcileBalanceActionService: SolanaReconcileBalanceActionService,
        private readonly solanaWithdrawActionService: SolanaWithdrawActionService,
    ) { }

    /**
     * Prepares a reconcile balance transaction for Solana.
     *
     * @param param - Parameters for preparing reconcile balance transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
     */
    public async prepareReconcileBalanceTransaction(param: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult> {
        return await this.solanaReconcileBalanceActionService.prepare(param)
    }

    /**
     * Executes a reconcile balance transaction for Solana.
     *
     * @param param - Parameters for executing reconcile balance transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeReconcileBalanceTransaction({ bot, prepareTxs })
     */
    public async executeReconcileBalanceTransaction(param: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResults> {
        return await this.solanaReconcileBalanceActionService.execute(param)
    }

    /**
     * Prepares a withdraw transaction for Solana.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareWithdrawTransaction({ bot, tokenInputs, toAddress })
     */
    public async prepareWithdrawTransaction(param: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult> {
        return await this.solanaWithdrawActionService.prepare(param)
    }

    /**
     * Executes a withdraw transaction for Solana.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeWithdrawTransaction({ bot, prepareTxs })
     */
    public async executeWithdrawTransaction(param: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        return await this.solanaWithdrawActionService.execute(param)
    }
}   
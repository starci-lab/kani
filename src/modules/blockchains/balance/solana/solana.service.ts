import {
    Injectable 
} from "@nestjs/common"
import {
    IBalanceActionService,
} from "../balance.interface"
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

@Injectable()
export class SolanaBalanceService implements IBalanceActionService {
    constructor(
        private readonly solanaReconcileBalanceActionService: SolanaReconcileBalanceActionService,
        private readonly solanaWithdrawActionService: SolanaWithdrawActionService,
    ) { }

    public async prepareReconcileBalanceTransaction(
        params: PrepareReconcileBalanceTransactionParams
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        return await this.solanaReconcileBalanceActionService.prepare(params)
    }

    public async executeReconcileBalanceTransaction(
        params: ExecuteReconcileBalanceTransactionParams
    ): Promise<ExecuteReconcileBalanceTransactionResults> {
        return await this.solanaReconcileBalanceActionService.execute(params)
    }

    public async prepareWithdrawTransaction(
        params: PrepareWithdrawTransactionParams
    ): Promise<PrepareWithdrawTransactionResult> {
        return await this.solanaWithdrawActionService.prepare(params)
    }

    public async executeWithdrawTransaction(
        params: ExecuteWithdrawTransactionParams
    ): Promise<ExecuteWithdrawTransactionResult> {
        return await this.solanaWithdrawActionService.execute(params)
    }
}   
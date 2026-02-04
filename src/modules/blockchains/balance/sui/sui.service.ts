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
    SuiReconcileBalanceActionService
} from "./reconcile-balance-action.service"
import {
    SuiWithdrawActionService
} from "./withdraw-action.service"

@Injectable()
export class SuiBalanceService implements IBalanceActionService {
    constructor(
        private readonly suiReconcileBalanceActionService: SuiReconcileBalanceActionService,
        private readonly suiWithdrawActionService: SuiWithdrawActionService,
    ) {}

    public async prepareReconcileBalanceTransaction(
        params: PrepareReconcileBalanceTransactionParams
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        return await this.suiReconcileBalanceActionService.prepare(params)
    }

    public async executeReconcileBalanceTransaction(
        params: ExecuteReconcileBalanceTransactionParams
    ): Promise<ExecuteReconcileBalanceTransactionResults> {
        return await this.suiReconcileBalanceActionService.execute(params)
    }

    public async prepareWithdrawTransaction(
        params: PrepareWithdrawTransactionParams
    ): Promise<PrepareWithdrawTransactionResult> {
        return await this.suiWithdrawActionService.prepare(params)
    }

    public async executeWithdrawTransaction(
        params: ExecuteWithdrawTransactionParams
    ): Promise<ExecuteWithdrawTransactionResult> {
        return await this.suiWithdrawActionService.execute(params)
    }
}
   
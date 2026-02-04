import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResults,
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "./types"
import {
    SolanaBalanceService 
} from "./solana"
import {
    ChainId 
} from "@modules/typedefs"
import {
    SuiBalanceService 
} from "./sui"

import {
    IBalanceActionService
} from "./types"

@Injectable()
export class BalanceActionService implements IBalanceActionService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly suiBalanceService: SuiBalanceService,
    ) {}

    async prepareReconcileBalanceTransaction(
        params: PrepareReconcileBalanceTransactionParams,
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareReconcileBalanceTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.prepareReconcileBalanceTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    async executeReconcileBalanceTransaction(
        params: ExecuteReconcileBalanceTransactionParams,
    ): Promise<ExecuteReconcileBalanceTransactionResults> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeReconcileBalanceTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.executeReconcileBalanceTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    async prepareWithdrawTransaction(
        params: PrepareWithdrawTransactionParams,
    ): Promise<PrepareWithdrawTransactionResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareWithdrawTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.prepareWithdrawTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    async executeWithdrawTransaction(
        params: ExecuteWithdrawTransactionParams,
    ): Promise<ExecuteWithdrawTransactionResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeWithdrawTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.executeWithdrawTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}

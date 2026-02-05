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
    DetermineReconcileBalancePlanParams,
    DetermineReconcileBalancePlanResult,
} from "./types"
import {
    SolanaBalanceService 
} from "./solana"
import {
    ChainId,
    TokenType
} from "@modules/typedefs"
import {
    SuiBalanceService 
} from "./sui"
import {
    BalanceFetcherService
} from "./fetcher.service"
import {
    SwapMathService
} from "../math"
import {
    TokenNotFoundException
} from "@modules/exceptions"
import BN from "bn.js"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    IBalanceActionService
} from "./types"

@Injectable()
export class BalanceActionService implements IBalanceActionService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly suiBalanceService: SuiBalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly swapMathService: SwapMathService,
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

    async determineReconcileBalancePlan({
        bot,
        targetBalanceAmount: _targetBalanceAmount,
        quoteBalanceAmount: _quoteBalanceAmount,
        gasBalanceAmount: _gasBalanceAmount,
    }: DetermineReconcileBalancePlanParams): Promise<DetermineReconcileBalancePlanResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: bot.chainId
            }
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    chainId: bot.chainId,
                    type: TokenType.Native,
                },
            })
        }
        let targetBalanceAmount: BN
        let quoteBalanceAmount: BN
        let gasBalanceAmount: BN
        if (
            _targetBalanceAmount &&
            _quoteBalanceAmount &&
            _gasBalanceAmount
        ) {
            targetBalanceAmount = _targetBalanceAmount
            quoteBalanceAmount = _quoteBalanceAmount
            gasBalanceAmount = _gasBalanceAmount
        } else {
            const {
                targetBalanceAmount: targetAmount,
                quoteBalanceAmount: quoteAmount,
                gasBalanceAmount: gasAmount,
            } = await this.balanceFetcherService.fetchBalances({
                bot,
            })
            targetBalanceAmount = targetAmount
            quoteBalanceAmount = quoteAmount
            gasBalanceAmount = gasAmount
        }
        return await this.swapMathService.computeSwapAmounts({
            targetToken,
            quoteToken,
            gasToken,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount
        })
    }
}

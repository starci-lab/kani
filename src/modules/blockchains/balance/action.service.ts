import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResult,
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
} from "@modules/common"
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

/**
 * Service responsible for balance action operations.
 * Handles transaction preparation and execution for reconcile balance and withdraw operations.
 *
 * @example
 * const service = new BalanceActionService(...)
 * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
 */
@Injectable()
export class BalanceActionService implements IBalanceActionService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly suiBalanceService: SuiBalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly swapMathService: SwapMathService,
    ) {}

    /**
     * Prepares a reconcile balance transaction.
     *
     * @param param - Parameters for preparing reconcile balance transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareReconcileBalanceTransaction({ bot, tokenInputs })
     */
    async prepareReconcileBalanceTransaction(param: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult> {
        const { bot } = param
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareReconcileBalanceTransaction(param)
        case ChainId.Sui:
            return this.suiBalanceService.prepareReconcileBalanceTransaction(param)
        default:
            throw new Error(`Unsupported chain id: ${bot.chainId}`)
        }
    }

    /**
     * Executes a reconcile balance transaction.
     *
     * @param param - Parameters for executing reconcile balance transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeReconcileBalanceTransaction({ bot, prepareTxs })
     */
    async executeReconcileBalanceTransaction(param: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResult> {
        const { bot } = param
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeReconcileBalanceTransaction(param)
        case ChainId.Sui:
            return this.suiBalanceService.executeReconcileBalanceTransaction(param)
        default:
            throw new Error(`Unsupported chain id: ${bot.chainId}`)
        }
    }

    /**
     * Prepares a withdraw transaction.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions
     *
     * @example
     * const result = await service.prepareWithdrawTransaction({ bot, tokenInputs, toAddress })
     */
    async prepareWithdrawTransaction(param: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult> {
        const { bot } = param
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareWithdrawTransaction(param)
        case ChainId.Sui:
            return this.suiBalanceService.prepareWithdrawTransaction(param)
        default:
            throw new Error(`Unsupported chain id: ${bot.chainId}`)
        }
    }

    /**
     * Executes a withdraw transaction.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Transaction hashes
     *
     * @example
     * const result = await service.executeWithdrawTransaction({ bot, prepareTxs })
     */
    async executeWithdrawTransaction(param: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        const { bot } = param
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeWithdrawTransaction(param)
        case ChainId.Sui:
            return this.suiBalanceService.executeWithdrawTransaction(param)
        default:
            throw new Error(`Unsupported chain id: ${bot.chainId}`)
        }
    }

    /**
     * Determines a reconcile balance plan with swap steps.
     *
     * @param param - Parameters for determining reconcile balance plan
     * @returns Swap steps and quote ratio result
     *
     * @example
     * const plan = await service.determineReconcileBalancePlan({ bot })
     */
    async determineReconcileBalancePlan({
        bot,
        targetBalanceAmount: _targetBalanceAmount,
        quoteBalanceAmount: _quoteBalanceAmount,
        gasBalanceAmount: _gasBalanceAmount,
    }: DetermineReconcileBalancePlanParams): Promise<DetermineReconcileBalancePlanResult> {
        // find target token from storage
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
        
        // find quote token from storage
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
        
        // find native gas token for chain
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
        
        // use provided balances or fetch from chain
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
            // fetch balances from chain
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
        
        // compute swap amounts and steps
        const { swapSteps, quoteRatioResult } = await this.swapMathService.computeSwapAmounts({
            targetToken,
            quoteToken,
            gasToken,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount
        })
        
        return {
            swapSteps,
            quoteRatioResult,
        }
    }
}

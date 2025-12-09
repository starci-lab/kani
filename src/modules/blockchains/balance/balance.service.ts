import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    FetchBalancesParams, 
    FetchBalancesResponse, 
    IBalanceService,
    ProcessSwapTransactionResponse,
    ProcessSwapTransactionParams,
} from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { ExecuteBalanceRebalancingParams } from "./balance.interface"
import { TokenType, ChainId } from "@typedefs"
import { SuiBalanceService } from "./sui.service"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InsufficientMinGasBalanceAmountException, 
    TargetOperationalGasAmountNotFoundException, 
    TokenNotFoundException,
    MinOperationalGasAmountNotFoundException,
    EstimatedSwappedTargetAmountNotFoundException,
    EstimatedSwappedQuoteAmountNotFoundException
} from "@exceptions"
import { GasStatusService } from "./gas-status.service"
import { 
    BalanceSnapshotConfirmationPayload, GasStatus, SwapConfirmationPayload } from "../types"
import BN from "bn.js"
import { SwapMathService } from "../math"
import { computeDenomination } from "@utils"
import Decimal from "decimal.js"
import { getMutexKey, MutexKey } from "@modules/lock"
import { Queue } from "bullmq"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { MutexService } from "@modules/lock"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiBalanceService: SuiBalanceService,
        private readonly gasStatusService: GasStatusService,
        private readonly swapMathService: SwapMathService,
        private readonly mutexService: MutexService,
        @InjectQueue(bullData[BullQueueName.BalanceSnapshotConfirmation].name)
        private readonly balanceSnapshotConfirmationQueue: Queue<BalanceSnapshotConfirmationPayload>,
        @InjectQueue(bullData[BullQueueName.SwapConfirmation].name)
        private readonly swapConfirmationQueue: Queue<SwapConfirmationPayload>,
    ) {}

    async executeBalanceRebalancing(
        {
            bot,
            withoutAcquireLock = false,
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        }: ExecuteBalanceRebalancingParams
    ) {
        const mutex = this.mutexService.mutex(
            getMutexKey(
                MutexKey.Action, 
                bot.id
            )
        )
        if (!withoutAcquireLock) {
            await mutex.acquire()
        } else {
            if (mutex.isLocked()) {
                return
            }
        }
        try {
            const targetToken = this.primaryMemoryStorageService.tokens.find(
                (token) => token.id === bot.targetToken.toString()
            )
            if (!targetToken) {
                throw new TokenNotFoundException("Target token not found")
            }
            const quoteToken = this.primaryMemoryStorageService.tokens.find(
                (token) => token.id === bot.quoteToken.toString()
            )
            if (!quoteToken) {
                throw new TokenNotFoundException("Quote token not found")
            }
            // if you pass the snapshot balances, we will use them instead of fetching the balances from on-chain
            let targetBalanceAmount: BN
            let quoteBalanceAmount: BN
            let gasBalanceAmount: BN
            if (
                snapshotTargetBalanceAmount 
                && snapshotQuoteBalanceAmount 
                && snapshotGasBalanceAmount
            ) {
                targetBalanceAmount = snapshotTargetBalanceAmount
                quoteBalanceAmount = snapshotQuoteBalanceAmount
                gasBalanceAmount = snapshotGasBalanceAmount
            } else {
                const { 
                    targetBalanceAmount: fetchedTargetBalanceAmount, 
                    quoteBalanceAmount: fetchedQuoteBalanceAmount, 
                    gasBalanceAmount: fetchedGasBalanceAmount, 
                } = await this.fetchBalances({
                    bot,
                })
                targetBalanceAmount = fetchedTargetBalanceAmount
                quoteBalanceAmount = fetchedQuoteBalanceAmount
                gasBalanceAmount = fetchedGasBalanceAmount
            }
            const { 
                processSwaps,
                swapTargetToQuoteAmount, 
                swapQuoteToTargetAmount, 
                estimatedSwappedTargetAmount,
                estimatedSwappedQuoteAmount,
                quoteRatioResponse
            } = await this.swapMathService.computeSwapAmounts({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
            if (!processSwaps) {
            // just snapshot the balances and return
            // ensure the balances are synced
                await this.balanceSnapshotConfirmationQueue.add(
                    bullData[BullQueueName.BalanceSnapshotConfirmation].name,
                    {
                        bot,
                        targetBalanceAmount: targetBalanceAmount.toString(),
                        quoteBalanceAmount: quoteBalanceAmount.toString(),
                        gasBalanceAmount: gasBalanceAmount.toString(),
                    }
                )
                return
            }
            const targetBalanceAmountInTarget = computeDenomination(
                targetBalanceAmount, 
                targetToken.decimals
            )
            const quoteBalanceAmountInTarget = computeDenomination(
                quoteBalanceAmount, 
                quoteToken.decimals
            ).div(quoteRatioResponse.oraclePrice)
            const totalBalanceAmountInTarget = targetBalanceAmountInTarget
                .add(quoteBalanceAmountInTarget)
            if (totalBalanceAmountInTarget.lt(new Decimal(targetToken.minRequiredAmountInTotal || 0))) {
                // snapshot the balances and return, since the balance is not enough to swap
                await this.balanceSnapshotConfirmationQueue.add(
                    bullData[BullQueueName.BalanceSnapshotConfirmation].name,
                    {
                        bot,
                        targetBalanceAmount: targetBalanceAmount.toString(),
                        quoteBalanceAmount: quoteBalanceAmount.toString(),
                        gasBalanceAmount: gasBalanceAmount.toString(),
                    }
                )
                return
            }
            if (swapTargetToQuoteAmount) {
                if (!estimatedSwappedQuoteAmount) {
                    throw new EstimatedSwappedQuoteAmountNotFoundException(
                        "Estimated swapped quote amount not found"
                    )
                }
                const { txHash } = await this.processSwapTransaction({
                    bot,
                    tokenIn: targetToken,
                    tokenOut: quoteToken,
                    amountIn: swapTargetToQuoteAmount,
                    estimatedSwappedAmount: estimatedSwappedQuoteAmount,
                })
                await this.swapConfirmationQueue.add(
                    bullData[BullQueueName.SwapConfirmation].name,
                    {
                        bot,
                        txHash,
                        amountIn: swapTargetToQuoteAmount.toString(),
                        tokenInId: targetToken.displayId,
                        tokenOutId: quoteToken.displayId,
                    }
                )
                return
            }
            if (swapQuoteToTargetAmount) {
                if (!estimatedSwappedTargetAmount) {
                    throw new EstimatedSwappedTargetAmountNotFoundException(
                        "Estimated swapped target amount not found"
                    )
                }
                const { txHash } = await this.processSwapTransaction({
                    bot,
                    tokenIn: quoteToken,
                    tokenOut: targetToken,
                    amountIn: swapQuoteToTargetAmount,
                    estimatedSwappedAmount: estimatedSwappedTargetAmount,
                })
                await this.swapConfirmationQueue.add(
                    bullData[BullQueueName.SwapConfirmation].name,
                    {
                        bot,
                        txHash,
                        amountIn: swapQuoteToTargetAmount.toString(),
                        tokenInId: quoteToken.displayId,
                        tokenOutId: targetToken.displayId,
                    }
                )
                return
            }
        } catch (error) {
            mutex.release()
            throw error
        }
    }

    public async fetchBalances(
        {
            bot,
        }: FetchBalancesParams
    ): Promise<FetchBalancesResponse> {
        const chainId = ChainId.Solana
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: targetToken.displayId,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: quoteToken.displayId,
        })
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        const targetOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                chainId,
                "Target operational gas amount not found"
            )
        }
        const minOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                chainId,
                "Min operational gas amount not found"
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            // we use the possible maximum amount of gas that can be used
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN, 
                targetBalanceAmount
            )
            if (
                effectiveGasAmountBN
                    .lt(minOperationalGasAmountBN)
            ) {
                throw new InsufficientMinGasBalanceAmountException(
                    chainId,
                    "Insufficient min gas balance amount"
                )
            }
            const targetBalanceAmountAfterDeductingGas = targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(targetOperationalGasAmountBN)
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
            }
        }
        default: {
            const gasToken = this.primaryMemoryStorageService.tokens.find(
                (token) => 
                    token.type === TokenType.Native 
                    && token.chainId === chainId
            )
            if (!gasToken) {
                throw new TokenNotFoundException("Gas token not found")
            }
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                tokenId: gasToken.displayId,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            }
        }
        }
    }

    public async fetchBalance(
        params: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalance(params)
        case ChainId.Sui:
            return this.suiBalanceService.fetchBalance(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async processSwapTransaction(
        params: ProcessSwapTransactionParams
    ): Promise<ProcessSwapTransactionResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.processSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.processSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}
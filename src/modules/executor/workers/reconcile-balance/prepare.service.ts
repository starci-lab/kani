import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    ReconcileBalanceJobMetadata,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import BN from "bn.js"
import {
    TokenNotFoundException
} from "@modules/exceptions"
import {
    TokenType
} from "@modules/typedefs"
import {
    SwapDirection
} from "@modules/blockchains"
import {
    BalanceService
} from "@modules/blockchains/balance"
import {
    PrepareSwapTransactionResult
} from "@modules/blockchains/balance"
import {
    JobSchema
} from "@modules/databases"
import {
    WinstonLog
} from "@modules/winston"
import {
    WinstonService
} from "@modules/winston"
import {
    Connection 
} from "mongoose"

@Injectable()
export class PrepareService {
    constructor(
        private readonly balanceService: BalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    // Phase: PREPARE
    // Responsibility:
    // - Ensure balances are available (either from payload or fetched live)
    // - Compute reconcile plan (swap steps)
    // - Transition job state from PENDING → PREPARED
    // Notes:
    // - This phase must be idempotent
    // - Safe to re-enter on retry
    /**
     * PREPARE phase.
     *
     * Ensures balances are available (payload or live fetch), computes the reconcile
     * swap plan, pre-builds swap transactions, and persists a state transition:
     * PENDING → PREPARED (including `metadata.swapTransactions`).
     *
     * Idempotency: if the job is already at/after PREPARED, returns the previously
     * persisted metadata instead of recomputing.
     */
    async process({
        job,
        bot, 
        payload: {
            gasBalanceAmount,
            quoteBalanceAmount,
            targetBalanceAmount,
        }
    }: PrepareParams): Promise<PrepareResult> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                }
            )
            return {
                result: job.metadata as ReconcileBalanceJobMetadata
            }
        }
        // Local normalized balance values (BN)
        // Initialized to zero to avoid accidental undefined usage
        let gasBalanceAmountBN = new BN(0)
        let quoteBalanceAmountBN = new BN(0)
        let targetBalanceAmountBN = new BN(0)

        // If any balance is missing from payload,
        // fetch live on-chain balances to ensure correctness
        if (
            !gasBalanceAmount || !quoteBalanceAmount || !targetBalanceAmount
        ) {
            const { 
                targetBalanceAmount, 
                quoteBalanceAmount, 
                gasBalanceAmount 
            } = await this.balanceService.fetchBalances({
                bot,
            })

            gasBalanceAmountBN = gasBalanceAmount
            quoteBalanceAmountBN = quoteBalanceAmount
            targetBalanceAmountBN = targetBalanceAmount
        } else {
        // Use balances provided by upstream step
        // (e.g. retry resume or pre-fetched context)
            gasBalanceAmountBN = gasBalanceAmount
            quoteBalanceAmountBN = quoteBalanceAmount
            targetBalanceAmountBN = targetBalanceAmount
        }

        // Compute reconcile plan:
        // - Determine required swaps
        // - No side effects (pure planning)
        const { swapSteps } =
        await this.balanceService.determineReconcileBalancePlan({
            bot,
            targetBalanceAmount: targetBalanceAmountBN,
            quoteBalanceAmount: quoteBalanceAmountBN,
            gasBalanceAmount: gasBalanceAmountBN,
        })

        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.targetToken.toString()
                }
            }
        )
        if (!targetToken) {
            throw new TokenNotFoundException(
                {
                    id: bot.targetToken.toString()
                }
            )
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.quoteToken.toString()
                }
            }
        )
        if (!quoteToken) {
            throw new TokenNotFoundException(
                {
                    id: bot.quoteToken.toString()
                }
            )
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                type: {
                    $eq: TokenType.Native
                },
                chainId: {
                    $eq: bot.chainId
                }
            }
        )
        if (!gasToken) {
            throw new TokenNotFoundException(
                {
                    conditions: {
                        type: TokenType.Native,
                        chainId: bot.chainId
                    }
                }
            )
        }
        const swapTransactions: Array<PrepareSwapTransactionResult> = []
        for (const swapStep of swapSteps) {
            const { direction, usedAmount, swappedAmount } = swapStep
            switch (direction) {
            case SwapDirection.TargetToQuote: {
                const swapTransaction = await this.balanceService.prepareSwapTransaction(
                    {
                        bot,
                        tokenIn: targetToken,
                        tokenOut: quoteToken,
                        amountIn: usedAmount,
                        estimatedSwappedAmount: swappedAmount,
                    }
                )
                swapTransactions.push(swapTransaction)
            }
                break
            case SwapDirection.QuoteToTarget: {
                const swapTransaction = await this.balanceService.prepareSwapTransaction(
                    {
                        bot,
                        tokenIn: quoteToken,
                        tokenOut: targetToken,
                        amountIn: usedAmount,
                        estimatedSwappedAmount: swappedAmount,
                    }
                )
                swapTransactions.push(swapTransaction)
                break
            }
            case SwapDirection.TargetToGas: {
                const swapTransaction = await this.balanceService.prepareSwapTransaction(
                    {
                        bot,
                        tokenIn: targetToken,
                        tokenOut: gasToken,
                        amountIn: usedAmount,
                        estimatedSwappedAmount: swappedAmount,
                    }
                )
                swapTransactions.push(swapTransaction)
                break
            }
            case SwapDirection.QuoteToGas: {
                const swapTransaction = await this.balanceService.prepareSwapTransaction(
                    {
                        bot,
                        tokenIn: quoteToken,
                        tokenOut: gasToken,
                        amountIn: usedAmount,
                        estimatedSwappedAmount: swappedAmount,
                    }
                )
                swapTransactions.push(swapTransaction)
                break
            }
            }
        }
        // Persist job state transition:
        // PENDING → PREPARED
        // This marks preparation as completed and enables execution phase
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id 
                },
                {
                    $set: {
                        status: JobStatus.Prepared,
                        "metadata.swapTransactions": swapTransactions,
                    },
                }
            )
        this.winstonService.log(
            WinstonLog.SwapTransactionPrepared,
            {
                botId: bot.id,
                txHashes: swapTransactions.map((swapTransaction) => swapTransaction.txHash),
            }
        )
        // Return execution plan to next phase
        return {
            result: {
                swapTransactions
            }
        }
    }
}
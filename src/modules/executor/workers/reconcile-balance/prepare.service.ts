import {
    Injectable
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    ReconcileBalanceBalanceAmounts,
    ReconcileBalanceJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import BN from "bn.js"
import {
    TokenNotFoundException,
    ReconcileBalanceJobPreparedFailedException,
} from "@modules/exceptions"
import {
    TokenType,
    ToStringObject
} from "@modules/typedefs"
import {
    SwapDirection,
    BalanceFetcherService,
    PrepareReconcileBalanceTransactionResult,
    ComputeQuoteRatioResult
} from "@modules/blockchains"
import {
    BalanceActionService,
    BalanceReconcileBalanceTokenInput
} from "@modules/blockchains"
import {
    JobSchema
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    Connection
} from "mongoose"
import {
    DayjsService,
    InjectSuperJson,
    AsyncService
} from "@modules/mixin"
import SuperJson from "superjson"
import {
    FatalError,
} from "../fatal"

@Injectable()
export class PrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        @InjectSuperJson()
        private readonly superJson: SuperJson,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
    ) { }

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
            const jobData = job.data as unknown as ToStringObject<ReconcileBalanceJobData>
            const { 
                reconcileBalanceTransaction: stringifiedReconcileBalanceTransaction, 
                quoteRatioResult: stringifiedQuoteRatioResult, 
                balanceAmounts: stringifiedBalanceAmounts, 
            } = jobData
            const reconcileBalanceTransaction = this.superJson.parse<PrepareReconcileBalanceTransactionResult>(stringifiedReconcileBalanceTransaction)
            const quoteRatioResult = this.superJson.parse<ComputeQuoteRatioResult>(stringifiedQuoteRatioResult)
            const balanceAmounts = this.superJson.parse<ReconcileBalanceBalanceAmounts>(stringifiedBalanceAmounts)
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                    quoteRatioResult,
                    balanceAmounts,
                }
            )
            return {
                result: {
                    reconcileBalanceTransaction,
                    quoteRatioResult,
                    balanceAmounts,
                }
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
            } = await this.balanceFetcherService.fetchBalances(
                {
                    bot,
                }
            )
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
        const { swapSteps, quoteRatioResult } =
            await this.balanceActionService.determineReconcileBalancePlan(
                {
                    bot,
                    targetBalanceAmount: targetBalanceAmountBN,
                    quoteBalanceAmount: quoteBalanceAmountBN,
                    gasBalanceAmount: gasBalanceAmountBN,
                }
            )
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
        // Convert swapSteps to tokenInputs for prepareReconcileBalanceTransaction
        const tokenInputs: Array<BalanceReconcileBalanceTokenInput> = []
        for (const swapStep of swapSteps) {
            const { direction, usedAmount } = swapStep
            switch (direction) {
            case SwapDirection.TargetToQuote: {
                tokenInputs.push({
                    tokenIn: targetToken,
                    tokenOut: quoteToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.QuoteToTarget: {
                tokenInputs.push({
                    tokenIn: quoteToken,
                    tokenOut: targetToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.TargetToGas: {
                tokenInputs.push({
                    tokenIn: targetToken,
                    tokenOut: gasToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.QuoteToGas: {
                tokenInputs.push({
                    tokenIn: quoteToken,
                    tokenOut: gasToken,
                    amount: usedAmount,
                })
                break
            }
            }
        }
        // Prepare reconcile balance transactions
        const [
            reconcileBalanceTransaction,
            error
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareReconcileBalanceTransaction(
                {
                    bot,
                    tokenInputs,
                }
            )
        )
        if (error) {
            const failedError = new ReconcileBalanceJobPreparedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
            })
            // throw everything as a fatal error to stop the job
            throw new FatalError(failedError.toJSON())
        }

        // Persist job state transition:
        // PENDING → PREPARED
        // This marks preparation as completed and enables execution phase
        const balanceAmounts: ReconcileBalanceBalanceAmounts = {
            targetBalanceAmount: targetBalanceAmountBN.toString(),
            quoteBalanceAmount: quoteBalanceAmountBN.toString(),
            gasBalanceAmount: gasBalanceAmountBN.toString(),
        }
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Prepared,
                        "data.reconcileBalanceTransaction": this.superJson.stringify(reconcileBalanceTransaction),
                        "data.quoteRatioResult": this.superJson.stringify(quoteRatioResult),
                        "data.balanceAmounts": this.superJson.stringify(balanceAmounts),
                    },
                }
            )

        this.winstonService.log(
            WinstonLog.ReconcileBalanceJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: reconcileBalanceTransaction.prepareTxs.map((prepareTx) => prepareTx.txHash),
                quoteRatioResult,
                balanceAmounts,
            }
        )
        // Return execution plan to next phase
        return {
            result: {
                reconcileBalanceTransaction,
                quoteRatioResult,
                balanceAmounts,
            }
        }
    }
}
/**
 * Reconcile Balance Worker
 *
 * BullMQ worker responsible for reconciling a bot's balances toward the configured target allocation.
 *
 * High-level pipeline:
 * - prepare(): fetch/normalize balances (if needed), compute reconcile plan, and prepare swap transactions
 * - sendHeartbeat(): ensure we still hold the lock authority (prevents stuck jobs)
 * - execute(): execute prepared swap transactions and collect transaction records
 * - confirm(): post-transaction updates (persist tx snapshots and update balance snapshots)
 * - onCompleted(): finalize job state + unlock bot
 * - onFailed(): classify and persist failure state, then rethrow
 *
 * Design goals:
 * - Idempotent phases (safe retries)
 * - Explicit persisted job status transitions (PENDING → PREPARED → EXECUTED → CONFIRMED → COMPLETED)
 */

import {
    AddTransactionRecordParams,
    BalanceService,
    BalanceSnapshotService,
    PrepareSwapTransactionResult,
    ReconcileBalancePayload,
    SwapDirection,
    TransactionSnapshotService
} from "@modules/blockchains"
import {
    Job, UnrecoverableError
} from "bullmq"
import {
    Connection
} from "mongoose"
import {
    BotSchema,
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    PrimaryMemoryStorageService,
    TransactionType,
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    Processor as Worker, WorkerHost
} from "@nestjs/bullmq"
import {
    BullQueueName, bullData
} from "@modules/bullmq"
import {
    envConfig
} from "@modules/env"
import {
    DayjsService, InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    LockAuthorityService
} from "../core"
import BN from "bn.js"
import {
    BotNotFoundException, 
    HeartbeatTimeoutException, 
    JobNotFoundException, 
    TokenNotFoundException
} from "@exceptions"
import {
    TokenType 
} from "@modules/typedefs"

export interface ReconcileBalanceJobMetadata {
    /**
     * Prepared swap transactions to be executed in order.
     * Persisted on the job document as metadata during the PREPARE phase.
     */
    swapTransactions: Array<PrepareSwapTransactionResult>

    /**
     * Post-execution transaction records (e.g., swaps) to be persisted during CONFIRM.
     * This is populated by execute() and may be absent if the job hasn't executed yet.
     */
    transactionRecords?: Array<AddTransactionRecordParams>
}

@Worker(
    bullData[
        BullQueueName.ReconcileBalance].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ReconcileBalanceWorker extends WorkerHost {
    /**
     * Creates the reconcile-balance BullMQ worker.
     *
     * This worker follows a two-phase approach:
     * - prepare(): compute an idempotent execution plan and persist job metadata
     * - execute(): perform the swaps and advance job state
     */
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly balanceService: BalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
    ) {
        super()
    }

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
    async prepare({
        job,
        bot, 
        payload: {
            gasBalanceAmount,
            quoteBalanceAmount,
            targetBalanceAmount,
        }
    }: PrepareParams): Promise<ReconcileBalanceJobMetadata> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            return job.metadata as ReconcileBalanceJobMetadata
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

        // Return execution plan to next phase
        return {
            swapTransactions
        }
    }

    /**
     * EXECUTE phase.
     *
     * Sends a heartbeat to the lock authority, then executes the prepared swap
     * transactions in order. Persists a state transition: PREPARED → EXECUTED.
     *
     * Idempotency: if the job is already at/after EXECUTED, it returns early.
     * Retry behavior: on retries, enables transaction checks (`txCheck`) while executing.
     */
    async execute(
        {
            job,
            bot,
            bullmqJob,
            prepareResult,
        }: ExecuteParams
    ): Promise<ReconcileBalanceJobMetadata> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            return job.metadata as ReconcileBalanceJobMetadata
        }
        const transactionRecords: Array<AddTransactionRecordParams> = []
        const { swapTransactions } = prepareResult
        for (const swapTransaction of swapTransactions) {
            await this.balanceService.executeSwapTransaction(
                {
                    bot,
                    txHash: swapTransaction.txHash,
                    tokenIn: swapTransaction.tokenIn,
                    tokenOut: swapTransaction.tokenOut,
                    signatureWithBytes: swapTransaction.signatureWithBytes,
                    // only check the transaction if it is a retry
                    txCheck: isRetry,
                    stimulate: true,
                }
            )
            transactionRecords.push(
                {
                    bot,
                    txHash: swapTransaction.txHash,
                    chainId: bot.chainId,
                    type: TransactionType.Swap,
                }
            )
        }
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id 
                },
                {
                    $set: {
                        status: JobStatus.Executed,
                    },
                }
            )
        return {
            ...prepareResult,
            transactionRecords,
        }
    }

    /**
     * Sends a heartbeat to the lock authority for this bot.
     *
     * If the heartbeat cannot be sent, this throws an UnrecoverableError so BullMQ
     * will not keep retrying a job that cannot safely proceed (prevents "stuck" locks).
     */
    async sendHeartbeat(
        {
            bot,
            job,
            bullmqJob,
        }: SendHeartbeatParams
    ) {
        // Send heartbeat to the lock authority
        const isHeartbeatSent = await this.lockAuthorityService.sendHeartbeat(
            {
                botId: bot.id,
            }
        )
        if (!isHeartbeatSent) {
            // if the heartbeat is not sent, we have to cancel the job to prevent the job from being stuck
            throw new UnrecoverableError(
                new HeartbeatTimeoutException(
                    {
                        botId: bot.id,
                        jobId: job.id,
                        bullmqJobId: bullmqJob.id,
                    }
                ).toJSON()
            )
        }
    }

    /**
     * CONFIRM phase.
     *
     * Performs post-transaction bookkeeping after swaps have been executed:
     * - re-fetch balances from chain
     * - persist transaction snapshot records (if any)
     * - persist updated bot balance snapshot
     * - transition job status to CONFIRMED
     *
     * Idempotency: if the job is already at/after CONFIRMED, returns early.
     */
    async confirm(
        {
            bot,
            job,
            executeResult,
        }: ConfirmParams
    ) {
        if (getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)) {
            return
        }
        const { transactionRecords } = executeResult
        // we do post-transaction updates here
        // first, we re-fetch the balances
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        session.withTransaction(
            async (session) => {
                // we iterate over the transaction records and add them to the database
                for (const transactionRecord of transactionRecords || []) {
                    await this.transactionSnapshotService.addTransactionRecord({
                        ...transactionRecord,
                        session,
                    })
                }
                // we update the bot snapshot balances
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                    session,
                })
            }
        )
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id 
                },
                {
                    $set: {
                        status: JobStatus.Confirmed,
                    },
                }
            )
    }

    /**
     * BullMQ entrypoint for the reconcile-balance queue.
     *
     * Loads bot + job documents, then runs the pipeline:
     * prepare() → execute() → onCompleted().
     *
     * On failure, delegates to onFailed() for state/log updates and rethrows.
     * Guard: on retry, if progress was never set, returns early to avoid reprocessing.
     */
    async process(
        bullmqJob: Job<string>
    ) {
        const isRetry = bullmqJob.attemptsMade > 0
        if (isRetry && !bullmqJob.progress) {
            return
        }
        const payload = this.superJson.parse<ReconcileBalancePayload>(bullmqJob.data)
        // find the bot
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(payload.botId)
        if (!bot) {
            throw new UnrecoverableError(
                new BotNotFoundException(
                    {
                        botId: payload.botId,
                    }
                ).toJSON()
            )
        // find the job
        }
        const job = await this.connection.model<JobSchema>(JobSchema.name).findById(payload.jobId)
        if (!job) {
            throw new UnrecoverableError(
                new JobNotFoundException(
                    {
                        jobId: payload.jobId,
                    }
                ).toJSON()
            )
        }
        await bullmqJob.updateProgress(1)
        try {
            // we get the prepare result
            const prepareResult = await this.prepare(
                {
                    job,
                    bot,
                    bullmqJob,
                    payload,
                }
            )
            await this.sendHeartbeat({
                job,
                bot,
                bullmqJob,
                payload,
            })
            const executeResult = await this.execute({
                job,
                bot,
                bullmqJob,
                payload,
                prepareResult,
            })
            await this.sendHeartbeat({
                job,
                bot,
                bullmqJob,
                payload,
            })
            await this.confirm({
                job,
                bot,
                bullmqJob,
                payload,
                executeResult,
            })
            await this.sendHeartbeat({
                job,
                bot,
                bullmqJob,
                payload,
            })
            await this.onCompleted(
                {
                    job,
                    bot,
                    bullmqJob,
                    payload,
                }
            )
        } catch (error) {
            await this.onFailed(
                {
                    job,
                    bot,
                    bullmqJob,
                    error,
                    payload,
                }
            )
        }
    }

    /**
     * Failure handler for reconcile-balance processing.
     *
     * Classifies failures into:
     * - unrecoverable (BullMQ `UnrecoverableError`): mark job FAILED immediately
     * - permanent (attempts exhausted): mark job FAILED and increment retryCount
     * - retryable: log as retrying and let BullMQ retry
     *
     * Always rethrows the original error so BullMQ can apply its retry/failure behavior.
     */
    async onFailed(
        {
            job,
            bot,
            bullmqJob,
            error,
        }: OnFailedParams
    ) {
        const maxAttempts = bullmqJob.opts.attempts ?? 1
        const isPermanentFailure = bullmqJob.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError
        // if the error is unrecoverable, delete the job schema
        if (isUnrecoverable) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceProcessingFailedUnrecoverable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
            // update the job schema to failed
            await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne({
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Failed,
                        processedAt: this.dayjsService.now().toDate(),
                    },
                }
                )
            // if the error is permanent failure, increment the retry count
        } else if (isPermanentFailure) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceProcessingFailedPermanentFailure,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
            // increment the retry count
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Failed,
                        processedAt: this.dayjsService.now().toDate(),
                    },
                    $inc: {
                        retryCount: 1,
                    },
                },
            )
        } else {
            // warn the user that the job is retrying
            this.winstonService.log(
                WinstonLog.ReconcileBalanceProcessingFailedRetryable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    attemptsMade: bullmqJob.attemptsMade,
                }
            )
        }
        throw error
    }

    /**
     * Completion handler for reconcile-balance processing.
     *
     * Marks the job COMPLETED, clears the bot's `activeJob`, and releases the lock
     * authority. Performs DB updates within a MongoDB transaction session.
     */
    async onCompleted({
        job,
        bot,
    }: OnCompletedParams) {
        // delete the job schema and release the lock authority
        const session = await this.connection.startSession()
        session.withTransaction(
            async () => {
                await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                    {
                        _id: job.id,
                    },
                    {
                        $set: {
                            status: JobStatus.Completed,
                            processedAt: this.dayjsService.now().toDate(),
                        },
                    }
                )
                await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                    {
                        _id: bot.id,
                    },
                    {
                        $unset: {
                            activeJob: null
                        },
                    },
                    {
                        session
                    }
                )
                // release the lock authority
                await this.lockAuthorityService.release(
                    {
                        botId: bot.id,
                    }
                )
            }
        )
    }
}

export interface ProcessParams {
    /**
     * Raw BullMQ job object (queue metadata, attempts, progress, etc.).
     * Note: actual business payload is stored in `bullmqJob.data` as SuperJSON.
     */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized reconcile-balance payload (botId/jobId + optional balances). */
    payload: ReconcileBalancePayload

}

/** Parameters for the PREPARE phase (same shape as ProcessParams). */
export type PrepareParams = ProcessParams

export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared swap transactions + optional metadata). */
    prepareResult: ReconcileBalanceJobMetadata
}

/** Parameters for sendHeartbeat() (same shape as ProcessParams). */
export type SendHeartbeatParams = ProcessParams

export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: ReconcileBalanceJobMetadata
}

export interface OnFailedParams extends ProcessParams {
    /** The error thrown during processing (used for classification + logging). */
    error: Error
}

/** Parameters for onCompleted() (same shape as ProcessParams). */
export type OnCompletedParams = ProcessParams
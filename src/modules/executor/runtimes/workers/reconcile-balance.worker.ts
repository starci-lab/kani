import {
    BalanceService,
    PrepareSwapTransactionResult,
    ReconcileBalancePayload,
    SwapDirection
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
    BotNotFoundException, HeartbeatTimeoutException, JobNotFoundException, 
    TokenNotFoundException
} from "@exceptions"
import {
    TokenType 
} from "@modules/typedefs"

export interface ReconcileBalanceJobMetadata {
    swapTransactions: Array<PrepareSwapTransactionResult>
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

    async execute(
        {
            job,
            bot,
            bullmqJob,
            prepareResult,
        }: ExecuteParams
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
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            return
        }
        const { swapTransactions } = prepareResult
        for (const swapTransaction of swapTransactions) {
            await this.balanceService.executeSwapTransaction(
                {
                    bot,
                    txHash: swapTransaction.txHash,
                    tokenIn: swapTransaction.tokenIn,
                    tokenOut: swapTransaction.tokenOut,
                    signatureWithBytes: swapTransaction.signatureWithBytes,
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
        return
    }

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
            await this.execute({
                job,
                bot,
                bullmqJob,
                payload,
                prepareResult,
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
    bullmqJob: Job<string>
    job: JobSchema
    bot: BotSchema
    payload: ReconcileBalancePayload

}

export type PrepareParams = ProcessParams
export interface ExecuteParams extends ProcessParams {
    prepareResult: ReconcileBalanceJobMetadata
}
export interface OnFailedParams extends ProcessParams {
    error: Error
}
export type OnCompletedParams = ProcessParams
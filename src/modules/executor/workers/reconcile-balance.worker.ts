import { ReconcileBalancePayload } from "@modules/blockchains"
import { SemaKey, SemaService, getSemaKey } from "@modules/lock"
import { Job, UnrecoverableError } from "bullmq"
import { Connection } from "mongoose"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    ReconcileBalanceJobData,
    TokenId,
} from "@modules/databases"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq"
import { bullData } from "@modules/bullmq"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { BalanceService, BalanceSnapshotService } from "@modules/blockchains"
import { BN } from "turbos-clmm-sdk"
import { SolanaTx } from "@modules/blockchains"
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { envConfig } from "@modules/env"
import { AsyncService, DayjsService } from "@modules/mixin"

@Worker(
    bullData[
        BullQueueName.ReconcileBalance].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
    }
)
export class ReconcileBalanceWorker extends WorkerHost {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly semaService: SemaService,
    ) {
        super()
    }

    async process({
        data: {
            bot,
            jobId,
            targetBalanceAmount: providedTargetBalanceAmount,
            quoteBalanceAmount: providedQuoteBalanceAmount,
            gasBalanceAmount: providedGasBalanceAmount,
        },
        attemptsMade,
    }: Job<ReconcileBalancePayload>) {
        // * Step 1: Acquire sema if not locked
        const sema = this.semaService.sema(getSemaKey(SemaKey.Action, bot.id))
        if (!sema.tryAcquire()) {
            return
        }
        // * Step 2: Get job from DB (when retry)
        // check if the sema is locked
        const isRetry = attemptsMade > 0
        let job: JobSchema | null = null
        if (isRetry) {
            job = await this.connection
                .model<JobSchema>(JobSchema.name)
                .findById(jobId)
            if (!job) {
                throw new UnrecoverableError("Job not found")
            }
        }
        const order = getJobStatusOrder(job?.status || JobStatus.Pending)

        // * Step 3: Retrieve balances (use provided snapshot balances or fetch)
        // retrieve the balances
        let targetBalanceAmount: BN | undefined = providedTargetBalanceAmount
        let quoteBalanceAmount: BN | undefined = providedQuoteBalanceAmount
        let gasBalanceAmount: BN | undefined = providedGasBalanceAmount
        // if the snapshot balances are provided, use them
        if (
            !targetBalanceAmount ||
            !quoteBalanceAmount ||
            !gasBalanceAmount
        ) {
            const {
                targetBalanceAmount: fetchedTargetBalanceAmount,
                quoteBalanceAmount: fetchedQuoteBalanceAmount,
                gasBalanceAmount: fetchedGasBalanceAmount,
            } = await this.balanceService.fetchBalances({
                bot,
            })
            targetBalanceAmount = fetchedTargetBalanceAmount
            quoteBalanceAmount = fetchedQuoteBalanceAmount
            gasBalanceAmount = fetchedGasBalanceAmount
        }
        if (!targetBalanceAmount || !quoteBalanceAmount || !gasBalanceAmount) {
            throw new UnrecoverableError(
                "Target balance amount, quote balance amount, or gas balance amount not found",
            )
        }
        // initialize the transaction hash
        let txHash = ""
        let needsSwap = false
        let tokenIn: TokenId | undefined = undefined
        let tokenOut: TokenId | undefined = undefined
        let solanaTx: SolanaTx | undefined = undefined
        let signatureWithBytes: SignatureWithBytes | undefined = undefined

        // * Step 4: Prepare (determine plan + prepare swap tx if needed)
        if (order < getJobStatusOrder(JobStatus.Prepared)) {
            const plan = await this.balanceService.determineReconcileBalancePlan({
                bot,
            })
            // if the plan needs swap, prepare for the swap
            if (plan.needsSwap) {
                needsSwap = true
                // determine the reconcile balance plan
                if (!plan.tokenIn || !plan.tokenOut) {
                    throw new UnrecoverableError("Token in or token out not found during swap preparation")
                }
                tokenIn = plan.tokenIn.displayId
                tokenOut = plan.tokenOut.displayId
                if (
                    !plan.amountIn ||
                    !plan.estimatedSwappedAmount
                ) {
                    throw new UnrecoverableError("Amount in or estimated swapped amount not found")
                }
                // prepare for the swap
                const { txHash: preparedTxHash, solanaTx: preparedSolanaTx, signatureWithBytes: preparedSignatureWithBytes } =
                    await this.balanceService.prepareSwapTransaction({
                        bot,
                        tokenIn,
                        tokenOut,
                        amountIn: plan.amountIn,
                        estimatedSwappedAmount: plan.estimatedSwappedAmount,
                    })
                txHash = preparedTxHash
                solanaTx = preparedSolanaTx
                signatureWithBytes = preparedSignatureWithBytes
            }
            // update the job with the swap transaction
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: jobId,
                },
                {
                    $set: {
                        txHash,
                        status: JobStatus.Prepared,
                        data: {
                            tokenIn,
                            tokenOut,
                            needsSwap
                        },
                    },
                },
            )
        } else {
            if (!job?.txHash) {
                throw new UnrecoverableError("Transaction hash not found")
            }
            if (!job.data) {
                throw new UnrecoverableError("Job data not found")
            }
            txHash = job.txHash
            const data = job.data as ReconcileBalanceJobData
            tokenIn = data.tokenIn
            tokenOut = data.tokenOut
            needsSwap = data.needsSwap
        }

        // * Step 5: Execute (send swap tx if needed)
        // we send the transaction to the network
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            if (needsSwap) {
                if (!tokenIn || !tokenOut) {
                    throw new UnrecoverableError("Token in or token out not found during swap execution")
                }
                this.logger.verbose(
                    WinstonLog.ReconcileBalanceExecuting, {
                        botId: bot.id,
                        jobId,
                        txHash,
                    })
                const [, error] = await this.asyncService.resolveTuple(
                    this.balanceService.executeSwapTransaction(
                        {
                            bot,
                            txHash,
                            tokenIn,
                            tokenOut,
                            isRetry,
                            solanaTx,
                            signatureWithBytes,
                        }
                    ),
                )
                if (error) {
                    throw new UnrecoverableError("Failed to execute swap transaction")
                }
                await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                    {
                        _id: jobId,
                    },
                    {
                        $set: {
                            status: JobStatus.Executed,
                        },
                    },
                )
            }
        }

        // * Step 6: Confirm (refetch balances if swapped + update snapshots)
        // thus, we just fetch the balances again and turn the job to completed
        if (needsSwap) {
            const {
                targetBalanceAmount: fetchedTargetBalanceAmount,
                quoteBalanceAmount: fetchedQuoteBalanceAmount,
                gasBalanceAmount: fetchedGasBalanceAmount,
            } = await this.balanceService.fetchBalances({
                bot,
            })
            targetBalanceAmount = fetchedTargetBalanceAmount
            quoteBalanceAmount = fetchedQuoteBalanceAmount
            gasBalanceAmount = fetchedGasBalanceAmount
        }
        // we update the snapshot balances
        await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
            bot,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        })
    }

    @OnWorkerEvent("failed")
    async onFailed(job: Job<ReconcileBalancePayload>, error: Error) {
        const { bot, jobId } = job.data
        const sema = this.semaService.sema(getSemaKey(SemaKey.Action, bot.id))
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError || error?.name === "UnrecoverableError"
        // if the error is unrecoverable, delete the job schema
        if (isUnrecoverable) {
            this.logger.error(WinstonLog.ReconcileBalanceFailed, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId,
                error: error.message,
                jobDeleted: true,
            })
            // delete the job schema
            await this.connection
                .model<JobSchema>(JobSchema.name)
                .deleteOne({ _id: jobId })
            sema.release()
            // if the error is permanent failure, increment the retry count
        } else if (isPermanentFailure) {
            this.logger.error(WinstonLog.ReconcileBalanceFailed, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId,
                error: error.message,
                jobDeleted: false,
            })
            // increment the retry count
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
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
            // release the sema
            sema.release()
        } else {
            // warn the user that the job is retrying
            this.logger.warn(WinstonLog.ReconcileBalanceRetrying, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId,
                error: error.message,
            })
        }
    }

    @OnWorkerEvent("completed")
    async onCompleted(job: Job<ReconcileBalancePayload>) {
        const { bot, jobId } = job.data
        const sema = this.semaService.sema(getSemaKey(SemaKey.Action, bot.id))
        this.eventEmitter.emit(
            createEventName(EventName.UpdateActiveBot, {
                botId: bot.id,
            }),
        )
        this.logger.info(WinstonLog.ReconcileBalanceSuccess, {
            botId: bot.id,
            jobId,
        })
        // delete the job schema
        await this.connection.model<JobSchema>(JobSchema.name).deleteOne({ _id: jobId })
        sema.release()
    }
}
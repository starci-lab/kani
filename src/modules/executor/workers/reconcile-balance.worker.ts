import { ReconcileBalancePayload } from "@modules/blockchains"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
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
import { AsyncService } from "@modules/mixin"

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
        private readonly mutexService: MutexService,
        private readonly eventEmitter: EventEmitter2,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly asyncService: AsyncService,
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
        // check if the mutex is locked
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
        // we send the transaction to the network
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            if (needsSwap) {
                if (!tokenIn || !tokenOut) {
                    throw new UnrecoverableError("Token in or token out not found during swap execution")
                }
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
                        }),
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
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        if (isPermanentFailure) {
            this.logger.error(WinstonLog.ReconcileBalanceFailed, {
                botId: bot.id,
                jobId,
                error: error.message,
            })
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                { $set: { status: JobStatus.Failed } }
            )
            mutex.release()
        }
        this.logger.warn(
            WinstonLog.ReconcileBalanceRetrying, {
                botId: bot.id,
                jobId,
                error: error.message,
                stack: error.stack,
            }
        )
    }

    @OnWorkerEvent("completed")
    async onCompleted(job: Job<ReconcileBalancePayload>) {
        const { bot, jobId } = job.data
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        this.eventEmitter.emit(
            createEventName(EventName.UpdateActiveBot, {
                botId: bot.id,
            }),
        )
        this.logger.info(WinstonLog.ReconcileBalanceSuccess, {
            botId: bot.id,
            jobId,
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            { _id: jobId },
            { $set: { status: JobStatus.Completed } }
        )
        mutex.release()
    }
}
import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { Job, UnrecoverableError } from "bullmq"
import { bullData } from "@modules/bullmq"
import {
    BalanceService,
    BalanceSnapshotService,
    OpenPositionSnapshotService,
    TransactionSnapshotService,
    OpenPositionPayload,
    OpenPositionOrchestratorService,
    SolanaTx,
    LiquidityPoolState,
    DlmmLiquidityPoolState,
    PositionValueMathService,
} from "@modules/blockchains"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    OpenPositionJobData,
} from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { Decimal } from "decimal.js"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { envConfig } from "@modules/env"
import { LeaseKey, LeaseService, getLeaseKey } from "@modules/lock"
/**
 * Worker responsible for processing open position confirmations.
 *
 * When an on-chain transaction is successfully executed, a job is added to this queue.
 * This ensures that confirmations are processed **reliably** and **asynchronously**,
 * allowing better fault tolerance, retry mechanisms, and system scalability.
 */
@Worker(
    bullData[BullQueueName.OpenPosition].name, 
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class OpenPositionWorker extends WorkerHost {
    constructor(
        private readonly leaseService: LeaseService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly openPositionOrchestratorService: OpenPositionOrchestratorService,
        private readonly asyncService: AsyncService,
        private readonly positionValueMathService: PositionValueMathService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) {
        super()
    }
    /**
   * Event handler triggered when a job becomes active.
   * Handles updating snapshot balances, recording open position transactions,
   * emitting events, and releasing distributed semas.
   */
    async process({
        data: 
        { jobId, bot, state, leaseId },
        attemptsMade,
    }: Job<OpenPositionPayload>) {
        // * Step 1: Ensure the lease is owned by the current job
        const lease = this.leaseService.lease(
            getLeaseKey(LeaseKey.Action, bot.id),
        )
        const ensured = lease.ensureOwnership(leaseId)
        if (!ensured) {
            throw new UnrecoverableError("Lease not owned by the current job")
        }
        // * Step 2: Get job from DB (when retry)
        const _state = this.superjson.parse<
            LiquidityPoolState | DlmmLiquidityPoolState
        >(state)
        // check if the job is a retry
        const isRetry = attemptsMade > 0
        // if isRetry, we get the job
        let job: JobSchema | null = null
        if (isRetry) {
            job = await this.connection
                .model<JobSchema>(JobSchema.name)
                .findById(jobId)
            if (!job) {
                // job not found, cancel the job
                throw new UnrecoverableError("Job not found")
            }
        }
        const order = getJobStatusOrder(job?.status || JobStatus.Pending)
        let txHash: string
        // transaction data
        let signatureWithBytes: SignatureWithBytes | undefined = undefined
        let solanaTx: SolanaTx | undefined = undefined
        let feeAmountA: BN
        let feeAmountB: BN
        let tickLower: Decimal | undefined = undefined
        let tickUpper: Decimal | undefined = undefined
        let amountA: BN | undefined = undefined
        let amountB: BN | undefined = undefined
        let minBinId: Decimal | undefined = undefined
        let maxBinId: Decimal | undefined = undefined
        let metadata: unknown | undefined = undefined
        let positionId: string | undefined = undefined
        let liquidity: BN | undefined = undefined
        // * Step 3: Prepare
        if (order < getJobStatusOrder(JobStatus.Prepared)) {
            // prepare the transaction and get the result
            const {
                txHash: preparedTxHash,
                signatureWithBytes: preparedSignatureWithBytes,
                solanaTx: preparedSolanaTx,
                feeAmountA: preparedFeeAmountA,
                feeAmountB: preparedFeeAmountB,
                tickLower: preparedTickLower,
                tickUpper: preparedTickUpper,
                amountA: preparedAmountA,
                amountB: preparedAmountB,
                minBinId: preparedMinBinId,
                maxBinId: preparedMaxBinId,
                metadata: preparedMetadata,
                positionId: preparedPositionId,
            } = await this.openPositionOrchestratorService.prepare({
                state: _state,
                bot,
            })
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                {
                    $set: {
                        status: JobStatus.Prepared,
                        txHash: preparedTxHash,
                        data: {
                            feeAmountA: preparedFeeAmountA.toString(),
                            feeAmountB: preparedFeeAmountB.toString(),
                            tickLower: preparedTickLower?.toString(),
                            tickUpper: preparedTickUpper?.toString(),
                            amountA: preparedAmountA?.toString(),
                            amountB: preparedAmountB?.toString(),
                            minBinId: preparedMinBinId?.toString(),
                            maxBinId: preparedMaxBinId?.toString(),
                            metadata: preparedMetadata,
                            positionId: preparedPositionId,
                        },
                    },
                },
            )
            txHash = preparedTxHash
            feeAmountA = preparedFeeAmountA
            feeAmountB = preparedFeeAmountB
            tickLower = preparedTickLower
            tickUpper = preparedTickUpper
            amountA = preparedAmountA ? new BN(preparedAmountA) : undefined
            amountB = preparedAmountB ? new BN(preparedAmountB) : undefined
            minBinId = preparedMinBinId ? new Decimal(preparedMinBinId) : undefined
            maxBinId = preparedMaxBinId ? new Decimal(preparedMaxBinId) : undefined
            metadata = preparedMetadata
            positionId = preparedPositionId
            solanaTx = preparedSolanaTx
            signatureWithBytes = preparedSignatureWithBytes
        } else {
            if (!job?.txHash) {
                throw new UnrecoverableError("Transaction hash not found")
            }
            if (!job.data) {
                throw new UnrecoverableError("Job data not found")
            }
            const data = job.data as OpenPositionJobData
            txHash = job.txHash
            positionId = data.positionId
            feeAmountA = new BN(data.feeAmountA)
            feeAmountB = new BN(data.feeAmountB)
            tickLower = data?.tickLower ? new Decimal(data.tickLower) : undefined
            tickUpper = data?.tickUpper ? new Decimal(data.tickUpper) : undefined
            amountA = data?.amountA ? new BN(data.amountA) : undefined
            amountB = data?.amountB ? new BN(data.amountB) : undefined
            minBinId = data?.minBinId ? new Decimal(data.minBinId) : undefined
            maxBinId = data?.maxBinId ? new Decimal(data.maxBinId) : undefined
            metadata = data?.metadata
        }
        // * Step 4: Execute
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            // execute the transaction
            this.logger.verbose(
                WinstonLog.OpenPositionExecuting, 
                {
                    botId: bot.id,
                    liquidityPoolId: _state.static.displayId,
                    jobId,
                    txHash,
                }
            )
            const [response, error] = await this.asyncService.resolveTuple(
                this.openPositionOrchestratorService.execute({
                    bot,
                    state: _state,
                    isRetry,
                    txHash,
                    signatureWithBytes,
                    solanaTx,
                    feeAmountA,
                    feeAmountB,
                    positionId,
                }),
            )
            if (error) {
                throw new UnrecoverableError(
                    "Failed to execute open position transaction",
                )
            }
            const { positionId: executedPositionId } = response
            positionId = executedPositionId
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                {
                    $set: {
                        status: JobStatus.Executed,
                        "data.positionId": executedPositionId,
                    },
                },
            )
        } else {
            if (!job?.data) {
                throw new UnrecoverableError("Job data not found")
            }
            const data = job.data as OpenPositionJobData
            positionId = data.positionId
        }
        // * Step 5: Confirm
        // confirm the position
        // fetch the balances after the position is opened
        const {
            targetBalanceAmount: targetBalanceAmountAfterOpen,
            quoteBalanceAmount: quoteBalanceAmountAfterOpen,
            gasBalanceAmount: gasBalanceAmountAfterOpen,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        // calculate the position value
        const { positionValue: positionValueAtOpen } =
            await this.positionValueMathService.calculatePositionValue({
                before: {
                    targetBalanceAmount: new BN(bot.snapshotTargetBalanceAmount || 0),
                    quoteBalanceAmount: new BN(bot.snapshotQuoteBalanceAmount || 0),
                    gasBalanceAmount: new BN(bot.snapshotGasBalanceAmount || 0),
                },
                after: {
                    targetBalanceAmount: targetBalanceAmountAfterOpen ?? new BN(0),
                    quoteBalanceAmount: quoteBalanceAmountAfterOpen ?? new BN(0),
                    gasBalanceAmount: gasBalanceAmountAfterOpen ?? new BN(0),
                },
                bot,
                isOpen: true,
                state: _state,
            })
        const { liquidity: confirmedLiquidity } =
            await this.openPositionOrchestratorService.confirm({
                positionId,
                state: _state,
            })
        liquidity = confirmedLiquidity
        const targetIsA =
            _state.static.tokenA.toString() === bot.targetToken.toString()
        const feeAmountTarget = targetIsA ? feeAmountA : feeAmountB
        const feeAmountQuote = targetIsA ? feeAmountB : feeAmountA
        // Start a MongoDB session for transactional updates
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            // Record open position transaction snapshot
            await this.transactionSnapshotService.addOpenPositionTransactionRecord({
                bot,
                txHash,
                session,
            })
            await this.openPositionSnapshotService.addOpenPositionRecord({
                snapshotTargetBalanceAmountBeforeOpen: new BN(
                    bot.snapshotTargetBalanceAmount || 0,
                ),
                snapshotQuoteBalanceAmountBeforeOpen: new BN(
                    bot.snapshotQuoteBalanceAmount || 0,
                ),
                snapshotGasBalanceAmountBeforeOpen: new BN(
                    bot.snapshotGasBalanceAmount || 0,
                ),
                liquidity: new BN(liquidity || 0),
                bot,
                targetIsA,
                tickLower: tickLower ? tickLower.toNumber() : undefined,
                tickUpper: tickUpper ? tickUpper.toNumber() : undefined,
                chainId: bot.chainId,
                liquidityPoolId: _state.static.displayId,
                positionId,
                openTxHash: txHash,
                session,
                feeAmountTarget: new BN(feeAmountTarget),
                feeAmountQuote: new BN(feeAmountQuote),
                maxBinId: maxBinId ? maxBinId.toNumber() : undefined,
                minBinId: minBinId ? minBinId.toNumber() : undefined,
                amountA: amountA ? new BN(amountA) : undefined,
                amountB: amountB ? new BN(amountB) : undefined,
                metadata,
                positionValueAtOpen,
            })
            // Update bot snapshot balances after the position is opened
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: targetBalanceAmountAfterOpen,
                quoteBalanceAmount: quoteBalanceAmountAfterOpen,
                gasBalanceAmount: gasBalanceAmountAfterOpen,
                session,
            })
        })
    }

    @OnWorkerEvent("failed")
    async onFailed(job: Job<OpenPositionPayload>, error: Error) {
        const { bot, jobId, state, leaseId } = job.data
        const _state = this.superjson.parse<
            LiquidityPoolState | DlmmLiquidityPoolState
        >(state)
        const lease = this.leaseService.lease(
            getLeaseKey(LeaseKey.Action, bot.id),
        )
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError || error?.name === "UnrecoverableError"
        // if the error is unrecoverable, delete the job schema
        if (isUnrecoverable) {
            this.logger.error(
                WinstonLog.OpenPositionFailed, {
                    botId: bot.id,
                    executorId: envConfig().botExecutor.executorId,
                    jobId,
                    liquidityPoolId: _state.static.displayId,
                    error: error.message,
                    jobDeleted: true,
                })
            // delete the job schema
            await this.connection.model<JobSchema>(JobSchema.name).deleteOne({ _id: jobId })
            lease.unlock(leaseId)
        // if the error is permanent failure, increment the retry count
        } else if (isPermanentFailure) {
            this.logger.error(
                WinstonLog.OpenPositionFailed, {
                    botId: bot.id,
                    executorId: envConfig().botExecutor.executorId,
                    jobId,
                    liquidityPoolId: _state.static.displayId,
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
            lease.unlock(leaseId)
        } else {
            // warn the user that the job is retrying
            this.logger.warn(
                WinstonLog.OpenPositionRetrying, {
                    botId: bot.id,
                    executorId: envConfig().botExecutor.executorId,
                    liquidityPoolId: _state.static.displayId,
                    jobId,
                    error: error.message,
                }
            )      
        }
    }

    @OnWorkerEvent("completed")
    async onCompleted(job: Job<OpenPositionPayload>) {
        const { bot, jobId, state, leaseId } = job.data
        const _state = this.superjson.parse<
            LiquidityPoolState | DlmmLiquidityPoolState
        >(state)
        const lease = this.leaseService.lease(
            getLeaseKey(LeaseKey.Action, bot.id),
        )
        this.eventEmitter.emit(
            createEventName(EventName.UpdateActiveBot, {
                botId: bot.id,
            }),
        )
        this.eventEmitter.emit(
            createEventName(EventName.PositionOpened, {
                botId: bot.id,
            }),
        )
        this.logger.info(WinstonLog.OpenPositionSuccess, {
            botId: bot.id,
            liquidityPoolId: _state.static.displayId,
            jobId,
        })
        // delete the job schema
        await this.connection.model<JobSchema>(JobSchema.name).deleteOne({ _id: jobId })
        lease.unlock(leaseId)
    }
}

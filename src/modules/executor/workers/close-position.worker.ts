import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { MutexKey, getMutexKey, MutexService } from "@modules/lock"
import { Job, UnrecoverableError } from "bullmq"
import { bullData } from "@modules/bullmq"
import {
    BalanceService,
    BalanceSnapshotService,
    ClosePositionSnapshotService,
    TransactionSnapshotService,
    ClosePositionPayload,
    ClosePositionOrchestratorService,
    ProfitabilityMathService,
    CalculateProfitability,
} from "@modules/blockchains"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose, 
    JobSchema, 
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"   
import { SignatureWithBytes } from "@mysten/sui/cryptography"
import { AsyncService } from "@modules/mixin"
import { SolanaTx } from "@modules/blockchains/interfaces"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
} from "@exceptions"

/**
 * Worker responsible for processing close position transactions.
 *
 * When a close position job is added to the queue, this worker handles:
 * 1. Preparing the close position transaction (if not already prepared)
 * 2. Executing the transaction
 * 3. Recording the transaction and updating balances
 * 4. Calculating profitability
 *
 * This ensures that close positions are processed **reliably** and **asynchronously**,
 * allowing better fault tolerance, retry mechanisms, and system scalability.
 */
@Worker(bullData[BullQueueName.ClosePosition].name)
export class ClosePositionWorker extends WorkerHost {
    constructor(
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly closePositionOrchestratorService: ClosePositionOrchestratorService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly profitabilityMathService: ProfitabilityMathService,
    ) {
        super()
    }

    async process(
        { 
            data: 
            { 
                jobId,
                bot, 
                state 
            }, 
            attemptsMade,
        }: Job<ClosePositionPayload>
    ) {
        // Validate active position exists
        if (!bot.activePosition) {
            throw new UnrecoverableError("Active position not found")
        }
        // check if the mutex is locked
        const isRetry = attemptsMade > 0
        // if isRetry, we get the job
        let job: JobSchema | null = null
        if (isRetry) {
            job = await this.connection.model<JobSchema>(
                JobSchema.name
            ).findById(jobId)
            if (!job) {
                // job not found, cancel the job
                throw new UnrecoverableError("Job not found")
            }
        }
        const order = getJobStatusOrder(job?.status || JobStatus.Pending)
        let txHash: string
        let signatureWithBytes: SignatureWithBytes | undefined = undefined
        let solanaTx: SolanaTx | undefined = undefined
        if (order < getJobStatusOrder(JobStatus.Prepared)) {
            // prepare the transaction and get the result
            const { 
                txHash: preparedTxHash,
                signatureWithBytes: preparedSignatureWithBytes,
                solanaTx: preparedSolanaTx,
            } = await this.closePositionOrchestratorService.prepare({
                state,
                bot,
            })
            await this.connection.model<JobSchema>(
                JobSchema.name
            ).updateOne(
                { _id: jobId },
                {
                    status: JobStatus.Prepared,
                    txHash: preparedTxHash,
                    metadata: {
                        solanaTx: preparedSolanaTx,
                    },
                }
            )
            txHash = preparedTxHash
            signatureWithBytes = preparedSignatureWithBytes
            solanaTx = preparedSolanaTx
        } else {
            if (!job?.txHash) {
                throw new UnrecoverableError("Transaction hash not found")
            }
            txHash = job.txHash
        }
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            const [, error] = await this.asyncService.resolveTuple(
                this.closePositionOrchestratorService.execute({
                    bot,
                    state,
                    isRetry,
                    txHash,
                    signatureWithBytes,
                    solanaTx,
                }))
            // if error found, return, cancel the job
            if (error) {
                throw new UnrecoverableError("Failed to execute close position transaction")
            }
            await this.connection.model<JobSchema>(
                JobSchema.name
            ).updateOne(
                { _id: jobId },
                {
                    $set: {
                        status: JobStatus.Executed,
                    },
                }
            )
        }
        // Get tokens for profitability calculation
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
        const targetIsA = bot.targetToken.toString() === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
        // Get snapshot balances before open
        const {
            snapshotTargetBalanceAmountBeforeOpen,
            snapshotQuoteBalanceAmountBeforeOpen,
            snapshotGasBalanceAmountBeforeOpen,
        } = bot.activePosition
        if (
            !snapshotTargetBalanceAmountBeforeOpen ||
            !snapshotQuoteBalanceAmountBeforeOpen ||
            !snapshotGasBalanceAmountBeforeOpen
        ) {
            throw new SnapshotBalancesBeforeOpenNotSetException(
                "Snapshot balances before open not set",
            )
        }
        // Fetch current balances after close
        const {
            targetBalanceAmount: afterTargetBalanceAmount,
            quoteBalanceAmount: afterQuoteBalanceAmount,
            gasBalanceAmount: afterGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const targetBalanceAmountBN = new BN(afterTargetBalanceAmount)
        const quoteBalanceAmountBN = new BN(afterQuoteBalanceAmount)
        const gasBalanceAmountBN = new BN(afterGasBalanceAmount)
        // Calculate profitability
        const before: CalculateProfitability = {
            targetTokenBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
            quoteTokenBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
            gasBalanceAmount: new BN(snapshotGasBalanceAmountBeforeOpen),
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount: targetBalanceAmountBN,
            quoteTokenBalanceAmount: quoteBalanceAmountBN,
            gasBalanceAmount: gasBalanceAmountBN,
        }
        const { roi, pnl } = await this.profitabilityMathService.calculateProfitability({
            before,
            after,
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            bot,
            state,
        })
        // Start a MongoDB session for transactional updates
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            if (!bot.activePosition) {
                throw new ActivePositionNotFoundException(
                    bot.id,
                    "Active position not found",
                )
            }
            // Record close position transaction snapshot
            await this.transactionSnapshotService.addClosePositionTransactionRecord({
                bot,
                txHash,
                session,
            })
            // Update bot snapshot balances after the position is closed
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: targetBalanceAmountBN || new BN(0),
                quoteBalanceAmount: quoteBalanceAmountBN || new BN(0),
                gasBalanceAmount: gasBalanceAmountBN || new BN(0),
                session,
            })
            // Update close position record with profitability
            await this.closePositionSnapshotService.updateClosePositionRecord({
                bot,
                pnl,
                roi,
                positionId: bot.activePosition.id,
                closeTxHash: txHash,
                session,
                snapshotTargetBalanceAmountAfterClose: new BN(
                    targetBalanceAmountBN || 0,
                ),
                snapshotQuoteBalanceAmountAfterClose: new BN(
                    quoteBalanceAmountBN || 0,
                ),
                snapshotGasBalanceAmountAfterClose: new BN(gasBalanceAmountBN || 0),
            })
        })
    }

    @OnWorkerEvent("failed")
    async onFailed(job: Job<ClosePositionPayload>, error: Error) {
        const { bot, jobId } = job.data
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        if (isPermanentFailure) {
            this.logger.error(WinstonLog.ClosePositionFailed, {
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
            WinstonLog.ClosePositionRetrying, {
                botId: bot.id,
                jobId,
                error: error.message,
            })
    }

    @OnWorkerEvent("completed")
    async onCompleted(job: Job<ClosePositionPayload>) {
        const { bot, jobId } = job.data
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        this.eventEmitter.emit(
            createEventName(EventName.UpdateActiveBot, {
                botId: bot.id,
            }),
        )
        this.eventEmitter.emit(
            createEventName(EventName.PositionClosed, {
                botId: bot.id,
            }),
        )
        this.logger.info(WinstonLog.ClosePositionSuccess, {
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
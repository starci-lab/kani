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
    LiquidityPoolState,
    DlmmLiquidityPoolState,
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
import { SolanaTx, PositionValueMathService } from "@modules/blockchains"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
} from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import Decimal from "decimal.js"

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
        private readonly positionValueMathService: PositionValueMathService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
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
        const _state = this.superjson.parse<LiquidityPoolState | DlmmLiquidityPoolState>(state)
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
                state: _state,
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
                    state: _state,
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
            (token) => token.id === _state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === _state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
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
        // Calculate position value at close
        const { 
            positionValue: positionValueAtClose 
        } = await this.positionValueMathService.calculatePositionValue(
            {
                before: {
                    targetBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
                    quoteBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
                    gasBalanceAmount: new BN(snapshotGasBalanceAmountBeforeOpen),
                },
                after: {
                    targetBalanceAmount: targetBalanceAmountBN,
                    quoteBalanceAmount: quoteBalanceAmountBN,
                    gasBalanceAmount: gasBalanceAmountBN,
                },
                bot,
                isOpen: false,
                state: _state,
            }
        )
        const roi = positionValueAtClose.div(bot.activePosition.positionValueAtOpen || new Decimal(0)).sub(1)
        const pnl = positionValueAtClose.sub(bot.activePosition.positionValueAtOpen || new Decimal(0))
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
                positionValueAtClose: positionValueAtClose,
                roi,
                pnl,
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
        const { bot, jobId, state } = job.data
        const _state = this.superjson.parse<LiquidityPoolState | DlmmLiquidityPoolState>(state)
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
            liquidityPoolId: _state.static.displayId,
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            { _id: jobId },
            { $set: { status: JobStatus.Completed } }
        )
        mutex.release()
    }
}
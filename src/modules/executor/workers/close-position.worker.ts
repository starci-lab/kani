import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
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
import { AsyncService, DayjsService } from "@modules/mixin"
import { SolanaTx, PositionValueMathService } from "@modules/blockchains"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
} from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"
import { AtomicLockKey, AtomicLockService, getAtomicLockKey } from "@modules/lock"

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
@Worker(
    bullData[BullQueueName.ClosePosition].name, 
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ClosePositionWorker extends WorkerHost {
    constructor(
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
    private readonly atomicLockService: AtomicLockService,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly dayjsService: DayjsService,
    ) {
        super()
    }

    async process({
        data: { jobId, bot, state },
        attemptsMade,
    }: Job<ClosePositionPayload>) {
        // * Step 1: Acquire sema if not locked
        const atomicLock = this.atomicLockService.atomicLock(
            getAtomicLockKey(AtomicLockKey.Action, bot.id),
        )
        // lock the atomic lock
        atomicLock.lock()
        // * Step 2: Get job from DB (when retry)
        const _state = this.superjson.parse<
            LiquidityPoolState | DlmmLiquidityPoolState
        >(state)
        // Validate active position exists
        if (!bot.activePosition) {
            throw new UnrecoverableError("Active position not found")
        }
        // check if the sema is locked
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
        let signatureWithBytes: SignatureWithBytes | undefined = undefined
        let solanaTx: SolanaTx | undefined = undefined
        // * Step 3: Prepare
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
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                {
                    status: JobStatus.Prepared,
                    txHash: preparedTxHash,
                    metadata: {
                        solanaTx: preparedSolanaTx,
                    },
                },
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

        // * Step 4: Execute
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            this.logger.verbose(
                WinstonLog.ClosePositionExecuting, {
                    botId: bot.id,
                    jobId,
                    txHash,
                }
            )
            const [, error] = await this.asyncService.resolveTuple(
                this.closePositionOrchestratorService.execute({
                    bot,
                    state: _state,
                    isRetry,
                    txHash,
                    signatureWithBytes,
                    solanaTx,
                }),
            )
            // if error found, return, cancel the job
            if (error) {
                throw new UnrecoverableError(
                    "Failed to execute close position transaction",
                )
            }
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                {
                    $set: {
                        status: JobStatus.Executed,
                    },
                },
            )
        }

        // * Step 5: Confirm (balances + profitability + snapshots)
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
        const {
            targetBalanceAmount: targetBalanceAmountAfterClose,
            quoteBalanceAmount: quoteBalanceAmountAfterClose,
            gasBalanceAmount: gasBalanceAmountAfterClose,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        // Calculate position value at close
        const { positionValue: positionValueAtClose } =
      await this.positionValueMathService.calculatePositionValue({
          before: {
              targetBalanceAmount: new BN(snapshotTargetBalanceAmountBeforeOpen),
              quoteBalanceAmount: new BN(snapshotQuoteBalanceAmountBeforeOpen),
              gasBalanceAmount: new BN(snapshotGasBalanceAmountBeforeOpen),
          },
          after: {
              targetBalanceAmount: targetBalanceAmountAfterClose,
              quoteBalanceAmount: quoteBalanceAmountAfterClose,
              gasBalanceAmount: gasBalanceAmountAfterClose,
          },
          bot,
          isOpen: false,
          state: _state,
      })
        const roi = positionValueAtClose
            .div(bot.activePosition.positionValueAtOpen || new Decimal(0))
            .sub(1)
        const pnl = positionValueAtClose.sub(
            bot.activePosition.positionValueAtOpen || new Decimal(0),
        )
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
                targetBalanceAmount: targetBalanceAmountAfterClose,
                quoteBalanceAmount: quoteBalanceAmountAfterClose,
                gasBalanceAmount: gasBalanceAmountAfterClose,
                session,
            })
            // Update close position record with profitability
            await this.closePositionSnapshotService.updateClosePositionRecord({
                bot,
                positionId: bot.activePosition.id,
                closeTxHash: txHash,
                session,
                snapshotTargetBalanceAmountAfterClose: targetBalanceAmountAfterClose,
                snapshotQuoteBalanceAmountAfterClose: quoteBalanceAmountAfterClose,
                snapshotGasBalanceAmountAfterClose: gasBalanceAmountAfterClose,
                positionValueAtClose: positionValueAtClose,
                roi,
                pnl,
            })
        })
        // * Step 6: Enqueue the reconcile balance job
        // enqueue the reconcile balance job
        await this.balanceService.enqueue({
            bot,
        })
    }

  @OnWorkerEvent("failed")
    async onFailed(job: Job<ClosePositionPayload>, error: Error) {
        const { bot, jobId, state } = job.data
        const _state = this.superjson.parse<
            LiquidityPoolState | DlmmLiquidityPoolState
        >(state)
        const atomicLock = this.atomicLockService.atomicLock(
            getAtomicLockKey(AtomicLockKey.Action, bot.id),
        )
        // lock the atomic lock
        atomicLock.lock()
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError || error?.name === "UnrecoverableError"
        // if the error is unrecoverable, delete the job schema
        if (isUnrecoverable) {
            this.logger.error(WinstonLog.ClosePositionFailed, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId,
                liquidityPoolId: _state.static.displayId,
                error: error.message,
                jobDeleted: true,
            })
            // delete the job schema
            await this.connection
                .model<JobSchema>(JobSchema.name)
                .deleteOne({ _id: jobId })
            atomicLock.unlock()
            // if the error is permanent failure, increment the retry count
        } else if (isPermanentFailure) {
            this.logger.error(WinstonLog.ClosePositionFailed, {
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
            atomicLock.unlock()
        } else {
            // warn the user that the job is retrying
            this.logger.warn(WinstonLog.ClosePositionRetrying, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                liquidityPoolId: _state.static.displayId,
                jobId,
                error: error.message,
            })
        }
    }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job<ClosePositionPayload>) {
      const { bot, jobId, state } = job.data
      const _state = this.superjson.parse<
      LiquidityPoolState | DlmmLiquidityPoolState
    >(state)
      // acquire the atomic lock
      const atomicLock = this.atomicLockService.atomicLock(
          getAtomicLockKey(AtomicLockKey.Action, bot.id),
      )
      // lock immediately
      atomicLock.lock()
      // emit the event
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
      // delete the job schema
      await this.connection
          .model<JobSchema>(JobSchema.name)
          .deleteOne({ _id: jobId })
      
      atomicLock.unlock()
  }
}

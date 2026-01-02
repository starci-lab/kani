import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { MutexKey, getMutexKey, MutexService } from "@modules/lock"
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
import { AsyncService } from "@modules/mixin"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
/**
 * Worker responsible for processing open position confirmations.
 *
 * When an on-chain transaction is successfully executed, a job is added to this queue.
 * This ensures that confirmations are processed **reliably** and **asynchronously**,
 * allowing better fault tolerance, retry mechanisms, and system scalability.
 */
@Worker(bullData[BullQueueName.OpenPosition].name)
export class OpenPositionWorker extends WorkerHost {
    constructor(
    private readonly mutexService: MutexService,
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
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    ) {
        super()
    }
    /**
   * Event handler triggered when a job becomes active.
   * Handles updating snapshot balances, recording open position transactions,
   * emitting events, and releasing distributed locks.
   */
    async process({
        data: { jobId, bot, state },
        attemptsMade,
    }: Job<OpenPositionPayload>) {
        const _state = this.superjson.parse<LiquidityPoolState | DlmmLiquidityPoolState>(state)
        // check if the mutex is locked
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
        let targetBalanceAmountBeforeOpen: BN | undefined = undefined
        let quoteBalanceAmountBeforeOpen: BN | undefined = undefined
        let gasBalanceAmountBeforeOpen: BN | undefined = undefined
        if (order < getJobStatusOrder(JobStatus.Prepared)) {
            // fetch the bot snapshot balances
            const {
                gasBalanceAmount,
                targetBalanceAmount,
                quoteBalanceAmount,
            } = await this.balanceService.fetchBalances({
                bot,
            })
            targetBalanceAmountBeforeOpen = new BN(targetBalanceAmount)
            quoteBalanceAmountBeforeOpen = new BN(quoteBalanceAmount)
            gasBalanceAmountBeforeOpen = new BN(gasBalanceAmount)
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
                        }
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
        
        if (order < getJobStatusOrder(JobStatus.Executed)) {
            // execute the transaction
            const [ response, error ] = await this.asyncService.resolveTuple(
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
                })
            )
            if (error) {
                throw new UnrecoverableError("Failed to execute open position transaction")
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
                }
            )
        } else {
            if (!job?.data) {
                throw new UnrecoverableError("Job data not found")
            }
            const data = job.data as OpenPositionJobData
            positionId = data.positionId
        }

        // confirm the position
        const { liquidity: confirmedLiquidity } = await this.openPositionOrchestratorService.confirm({
            positionId,
            state: _state,
        })
        liquidity = confirmedLiquidity
        const targetIsA = _state.static.tokenA.toString() === bot.targetToken.toString()
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
                snapshotTargetBalanceAmountBeforeOpen: targetBalanceAmountBeforeOpen ?? new BN(0),
                snapshotQuoteBalanceAmountBeforeOpen: quoteBalanceAmountBeforeOpen ?? new BN(0),
                snapshotGasBalanceAmountBeforeOpen: gasBalanceAmountBeforeOpen ?? new BN(0),
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
                positionValueAtOpen: new Decimal(0),
            }
            )
            // Update bot snapshot balances after the position is opened
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: targetBalanceAmountBeforeOpen ?? new BN(0),
                quoteBalanceAmount: quoteBalanceAmountBeforeOpen ?? new BN(0),
                gasBalanceAmount: gasBalanceAmountBeforeOpen ?? new BN(0),
                session,
            })
        })
    }

  @OnWorkerEvent("failed")
    async onFailed(job: Job<OpenPositionPayload>, error: Error) {
        const { bot, jobId, state } = job.data
        const _state = this.superjson.parse<LiquidityPoolState | DlmmLiquidityPoolState>(state)
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        if (isPermanentFailure) {
            this.logger.error(WinstonLog.OpenPositionFailed, {
                botId: bot.id,
                jobId,
                liquidityPoolId: _state.static.displayId,
                error: error.message,
            })
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                { $set: { status: JobStatus.Failed } }
            )
            mutex.release()
        }
        this.logger.warn(
            WinstonLog.OpenPositionRetrying, {
                botId: bot.id,
                liquidityPoolId: _state.static.displayId,
                jobId,
                error: error.message,
            })
    }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job<OpenPositionPayload>) {
      const { bot, jobId, state } = job.data
      const _state = this.superjson.parse<LiquidityPoolState | DlmmLiquidityPoolState>(state)
      const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
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
      await this.connection.model<JobSchema>(JobSchema.name).updateOne(
          { _id: jobId },
          { $set: { status: JobStatus.Completed } }
      )
      mutex.release()
  }
}
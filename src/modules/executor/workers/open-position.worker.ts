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
} from "@modules/blockchains"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Transaction } from "@mysten/sui/transactions"
import { Decimal } from "decimal.js"
import { AsyncService } from "@modules/mixin"
import { KeyPairSigner } from "@solana/kit"

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
        let txb: Transaction | undefined = undefined
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
        let ataAddress: string | undefined = undefined
        let liquidity: BN | undefined = undefined
        let positionId: string | undefined = undefined
        if (order < getJobStatusOrder(JobStatus.Prepared)) {
            // prepare the transaction and get the result
            const {
                txHash: preparedTxHash,
                txb: preparedTxb,
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
                ataAddress: preparedAtaAddress,
                liquidity: preparedLiquidity,
            } = await this.openPositionOrchestratorService.prepare({
                state,
                bot,
            })
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                {
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
                        ataAddress: preparedAtaAddress,
                        liquidity: preparedLiquidity?.toString(),
                        metadata: preparedMetadata,
                    }
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
            ataAddress = preparedAtaAddress
            liquidity = preparedLiquidity ? new BN(preparedLiquidity) : undefined
            solanaTx = preparedSolanaTx
            txb = preparedTxb
        } else {
            if (!job?.txHash) {
                throw new UnrecoverableError("Transaction hash not found")
            }
            if (!job.data) {
                throw new UnrecoverableError("Job data not found")
            }
            const data = job.data as OpenPositionJobData
            txHash = job.txHash
            feeAmountA = new BN(data.feeAmountA)
            feeAmountB = new BN(data.feeAmountB)
            tickLower = data?.tickLower ? new Decimal(data.tickLower) : undefined
            tickUpper = data?.tickUpper ? new Decimal(data.tickUpper) : undefined
            amountA = data?.amountA ? new BN(data.amountA) : undefined
            amountB = data?.amountB ? new BN(data.amountB) : undefined
            minBinId = data?.minBinId ? new Decimal(data.minBinId) : undefined
            maxBinId = data?.maxBinId ? new Decimal(data.maxBinId) : undefined
            ataAddress = data?.ataAddress
            liquidity = data?.liquidity ? new BN(data.liquidity) : undefined
            metadata = data?.metadata
            ataAddress = data?.ataAddress
            liquidity = data?.liquidity ? new BN(data.liquidity) : undefined
        }
        // execute the transaction
        const [ response, error ] = await this.asyncService.resolveTuple(
            this.openPositionOrchestratorService.execute({
                bot,
                state,
                isRetry,
                txHash,
                txb,
                solanaTx,
                feeAmountA,
                feeAmountB,
                ataAddress,
                liquidity,
            })
        )
        if (error) {
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                { _id: jobId },
                { status: JobStatus.Failed }
            )
            throw new UnrecoverableError("Failed to execute open position transaction")
        }
        const { liquidity, positionId } = response
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            { _id: jobId },
            { status: JobStatus.Executed,
                data: {
                    liquidity: executedLiquidity?.toString(),
                    ataAddress: executedAtaAddress,
                }
            }
        )
        liquidity = executedLiquidity
        ataAddress = executedAtaAddress

    // // fetch the bot snapshot balances
    // const {
    //     gasBalanceAmount,
    //     targetBalanceAmount,
    //     quoteBalanceAmount,
    // } = await this.balanceService.fetchBalances({
    //     bot,
    // })
    // const targetIsA = state.static.tokenA.toString() === bot.targetToken.toString()
    // const feeAmountTarget = targetIsA ? feeAmountA : feeAmountB
    // const feeAmountQuote = targetIsA ? feeAmountB : feeAmountA
    // // Start a MongoDB session for transactional updates
    // const session = await this.connection.startSession()
    // await session.withTransaction(async () => {
    //     // Record open position transaction snapshot
    //     await this.transactionSnapshotService.addOpenPositionTransactionRecord({
    //         bot,
    //         txHash,
    //         session,
    //     })
    //     await this.openPositionSnapshotService.addOpenPositionRecord({
    //         snapshotTargetBalanceAmountBeforeOpen: new BN(targetBalanceAmount),
    //         snapshotQuoteBalanceAmountBeforeOpen: new BN(quoteBalanceAmount),
    //         snapshotGasBalanceAmountBeforeOpen: new BN(gasBalanceAmount),
    //         liquidity: new BN(response.liquidity || 0),
    //         bot,
    //         targetIsA,
    //         tickLower: tickLower ? tickLower.toNumber() : undefined,
    //         tickUpper: tickUpper ? tickUpper.toNumber() : undefined,
    //         chainId: bot.chainId,
    //         liquidityPoolId: state.static.displayId,
    //         positionId: response.positionId,
    //         openTxHash: txHash,
    //         session,
    //         feeAmountTarget: new BN(feeAmountTarget),
    //         feeAmountQuote: new BN(feeAmountQuote),
    //         maxBinId: maxBinId ? maxBinId.toNumber() : undefined,
    //         minBinId: minBinId ? minBinId.toNumber() : undefined,
    //         amountA: amountA ? new BN(amountA) : undefined,
    //         amountB: amountB ? new BN(amountB) : undefined,
    //         metadata
    //     })
    //     // Update bot snapshot balances after the position is opened
    //     await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
    //         bot,
    //         targetBalanceAmount,
    //         quoteBalanceAmount,
    //         gasBalanceAmount,
    //         session,
    //     })
    // })
    // // Emit events for other parts of the system to react to
    // this.eventEmitter.emit(createEventName(EventName.UpdateActiveBot, { botId: bot.id }))
    // this.eventEmitter.emit(createEventName(EventName.PositionOpened, { botId: bot.id }))
    // // Log successful processing
    // this.logger.verbose(
    //     WinstonLog.OpenPositionSuccess, {
    //         botId: bot.id,
    //         positionId: response.positionId,
    //     })
    // // Release the mutex after processing the position
    // mutex.release()
    // // update the job status to completed
    // await this.connection.model<JobSchema>(
    //     JobSchema.name
    // ).updateOne(
    //     { _id: jobId },
    //     {
    //         status: JobStatus.Completed,
    //     }
    // )
    }

  @OnWorkerEvent("failed")
    async onFailed(job: Job<OpenPositionPayload>, error: Error) {
        const { bot, jobId, state } = job.data
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        const maxAttempts = job.opts.attempts ?? 1
        const isPermanentFailure = job.attemptsMade >= maxAttempts
        if (isPermanentFailure) {
            this.logger.error(WinstonLog.OpenPositionFailed, {
                botId: bot.id,
                jobId,
                liquidityPoolId: state.static.displayId,
                error: error.message,
            })
            mutex.release()
        }
        this.logger.warn(
            WinstonLog.OpenPositionRetrying, {
                botId: bot.id,
                liquidityPoolId: state.static.displayId,
                jobId,
                error: error.message,
            })
    }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job<OpenPositionPayload>) {
      const { bot, jobId, state } = job.data
      const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
      this.eventEmitter.emit(
          createEventName(EventName.UpdateActiveBot, {
              botId: bot.id,
          }),
      )
      this.logger.info(WinstonLog.OpenPositionSuccess, {
          botId: bot.id,
          liquidityPoolId: state.static.displayId,
          jobId,
      })
      mutex.release()
  }
}

interface OpenPositionJobData {
    txHash: string
    feeAmountA: string
    feeAmountB: string
    tickLower: string
    tickUpper: string
    amountA: string
    amountB: string
    minBinId: string
    maxBinId: string
    metadata: unknown
    ataAddress: string
    liquidity: string
}
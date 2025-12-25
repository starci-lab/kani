import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { MutexKey, getMutexKey, MutexService } from "@modules/lock"
import { Job } from "bullmq"
import { bullData } from "@modules/bullmq"
import {
    BalanceService,
    BalanceSnapshotService,
    OpenPositionSnapshotService,
    TransactionSnapshotService,
    OpenPositionPayload,
    OpenPositionOrchestratorService
} from "@modules/blockchains"
import { 
    InjectPrimaryMongoose, 
    JobSchema, 
    JobType, 
    JobStatus
} from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { Mutex } from "async-mutex"

/**
 * Worker responsible for processing open position confirmations.
 *
 * When an on-chain transaction is successfully executed, a job is added to this queue.
 * This ensures that confirmations are processed **reliably** and **asynchronously**,
 * allowing better fault tolerance, retry mechanisms, and system scalability.
 */
@Worker(bullData[BullQueueName.OpenPosition].name)
export class OpenPositionWorker extends WorkerHost implements OnModuleInit {
    private readonly mutex: Mutex
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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionOrchestratorService: OpenPositionOrchestratorService
    ) {
        super()
    }

    // initialize the mutex
    async onModuleInit() {
        await this.mutex.acquire()
    }

    /**
     * Event handler triggered when a job becomes active.
     * Handles updating snapshot balances, recording open position transactions,
     * emitting events, and releasing distributed locks.
     */
    async process(
        { bot, liquidityPoolId }: OpenPositionPayload
    ) {
        // acquire the mutex
        await this.mutex.acquire()
 
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            (liquidityPool) => liquidityPool.displayId === liquidityPoolId
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId, `Liquidity pool ${liquidityPoolId} not found`)
        }
        const [ jobRaw ] = await this.connection.model<JobSchema>(
            JobSchema.name
        ).create(
            [
                {
                    liquidityPool: liquidityPool.id,
                    botId: bot.id,
                    type: JobType.OpenPosition,
                    status: JobStatus.Pending,
                }
            ])
        // we take the id from the jobRaw object
        const jobId = jobRaw.toJSON().id
        await this.openPositionOrchestratorService.execute({
            liquidityPoolId: liquidityPoolId,
            bot,
        })
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
                snapshotTargetBalanceAmountBeforeOpen: snapshotTargetBalanceAmountBN,
                snapshotQuoteBalanceAmountBeforeOpen: snapshotQuoteBalanceAmountBN,
                snapshotGasBalanceAmountBeforeOpen: snapshotGasBalanceAmountBN,
                liquidity: new BN(liquidity || 0),
                bot,
                targetIsA,
                tickLower,
                tickUpper,
                chainId: bot.chainId,
                liquidityPoolId: state.static.displayId,
                positionId,
                openTxHash: txHash,
                session,
                feeAmountTarget: new BN(feeAmountTarget),
                feeAmountQuote: new BN(feeAmountQuote),
                maxBinId,
                minBinId,
                amountA: amountA ? new BN(amountA) : undefined,
                amountB: amountB ? new BN(amountB) : undefined,
                metadata
            })
            // Update bot snapshot balances after the position is opened
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
                session,
            })
        })
        // Emit events for other parts of the system to react to
        this.eventEmitter.emit(createEventName(EventName.UpdateActiveBot, { botId: bot.id }))
        this.eventEmitter.emit(createEventName(EventName.PositionOpened, { botId: bot.id }))
        // Log successful processing
        this.logger.verbose(
            WinstonLog.OpenPositionConfirmationSuccess, {
                botId: bot.id,
                positionId,
            })
        // Release the mutex after processing the position
        mutex.release()
    }

    /**
     * Event handler triggered when a job fails.
     * Logs the error details for debugging and monitoring purposes.
     */
    @OnWorkerEvent("failed")
    async onFailed(job: Job<OpenPositionConfirmationPayload>, error: Error) {
        const { bot, txHash } = job.data
        this.logger.error(
            WinstonLog.OpenPositionConfirmationFailed, 
            {
                botId: bot.id,
                error: error.message,
                stack: error.stack,
                txHash,
            })
    }
}
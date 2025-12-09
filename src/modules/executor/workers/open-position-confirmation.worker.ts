import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
import { Job } from "bullmq"
import { bullData } from "@modules/bullmq"
import {
    BalanceService,
    BalanceSnapshotService,
    OpenPositionConfirmationPayload,
    OpenPositionSnapshotService,
} from "@modules/blockchains"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"

/**
 * Worker responsible for processing open position confirmations.
 *
 * When an on-chain transaction is successfully executed, a job is added to this queue.
 * This ensures that confirmations are processed **reliably** and **asynchronously**,
 * allowing better fault tolerance, retry mechanisms, and system scalability.
 */
@Worker(bullData[BullQueueName.OpenPositionConfirmation].name)
export class OpenPositionConfirmationWorker extends WorkerHost {
    constructor(
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {
        super()
    }

    /**
     * Event handler triggered when a job becomes active.
     * Handles updating snapshot balances, recording open position transactions,
     * emitting events, and releasing distributed locks.
     */
    async process(
        job: Job<OpenPositionConfirmationPayload>
    ) {
        const {
            bot,
            txHash,
            state,
            positionId,
            snapshotTargetBalanceAmountBeforeOpen,
            snapshotQuoteBalanceAmountBeforeOpen,
            snapshotGasBalanceAmountBeforeOpen,
            liquidity,
            feeAmountTarget,
            feeAmountQuote,
            tickLower,
            tickUpper,
            minBinId,
            maxBinId,
            amountA,
            amountB,
        } = job.data
        // Retrieve the mutex for the bot
        const mutex = this.mutexService.mutex(
            getMutexKey(
                MutexKey.Action, 
                bot.id
            )
        )
        // Convert snapshot balances to BN instances for precision
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmountBeforeOpen)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmountBeforeOpen)
        const snapshotGasBalanceAmountBN = new BN(snapshotGasBalanceAmountBeforeOpen)

        // Refetch current balances after the position is opened
        const { targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount } =
            await this.balanceService.fetchBalances({ bot })

        const targetIsA = bot.targetToken.toString() === state.static.tokenA.toString()
        // Start a MongoDB session for transactional updates
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            // Record open position transaction snapshot
            await this.openPositionSnapshotService.addOpenPositionTransactionRecord({
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
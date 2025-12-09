import { 
    BalanceSnapshotService, 
    SwapTransactionSnapshotService,
    SwapConfirmationPayload,
    BalanceService,
} from "@modules/blockchains"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
import { Job } from "bullmq"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { OnWorkerEvent, Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { bullData } from "@modules/bullmq"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import BN from "bn.js"

@Worker(bullData[BullQueueName.SwapConfirmation].name)
export class SwapConfirmationWorker extends WorkerHost {
    constructor(
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {
        super()
    }

    async process(
        job: Job<SwapConfirmationPayload>
    ) {
        const { bot, txHash, amountIn, tokenInId, tokenOutId } = job.data
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        const session = await this.connection.startSession()
        const { 
            targetBalanceAmount, 
            quoteBalanceAmount, 
            gasBalanceAmount 
        } = await this.balanceService.fetchBalances({ bot })
        await session.withTransaction(async () => {
            // Update the bot snapshot balances
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: new BN(targetBalanceAmount),
                quoteBalanceAmount: new BN(quoteBalanceAmount),
                gasBalanceAmount: new BN(gasBalanceAmount),
                session,
            })
            await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                bot,
                txHash,
                session,
                amountIn: new BN(amountIn),
                tokenInId,
                tokenOutId,
            })
            // Emit event to update the active bot
            this.eventEmitter.emit(
                createEventName(
                    EventName.UpdateActiveBot, {
                        botId: bot.id,
                    }))
            // Log successful processing
            this.logger.verbose(
                WinstonLog.SwapConfirmationSuccess, 
                {
                    botId: bot.id,
                    txHash,
                })
            // Release the mutex after processing the swap
            mutex.release()
        })
    }

    @OnWorkerEvent("failed")
    async onFailed(job: Job<SwapConfirmationPayload>, error: Error) {
        const { bot, txHash } = job.data
        this.logger.error(WinstonLog.BalanceSnapshotConfirmationFailed, {
            botId: bot.id,
            txHash,
            error: error.message,
            stack: error.stack,
        })
    }
}
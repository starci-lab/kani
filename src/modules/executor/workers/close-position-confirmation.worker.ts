import { OnWorkerEvent, WorkerHost, Processor as Worker } from "@nestjs/bullmq"
import { BullQueueName } from "@modules/bullmq/types"
import { RedlockKey, RedlockService } from "@modules/lock"
import { Job } from "bullmq"
import { bullData } from "@modules/bullmq"
import {
    BalanceService,
    BalanceSnapshotService,
    CalculateProfitability,
    ClosePositionConfirmationPayload,
    ClosePositionSnapshotService,
    ProfitabilityMathService,
    SwapTransactionSnapshotService,
} from "@modules/blockchains"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import BN from "bn.js"
import { createEventName, EventName } from "@modules/event"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SnapshotBalancesBeforeOpenNotSetException,
} from "@exceptions"
import { PrimaryMemoryStorageService } from "@modules/databases"

@Worker(bullData[BullQueueName.ClosePositionConfirmation].name)
export class ClosePositionConfirmationWorker extends WorkerHost {
    constructor(
    private readonly redlockService: RedlockService,
    private readonly balanceService: BalanceService,
    private readonly balanceSnapshotService: BalanceSnapshotService,
    private readonly closePositionSnapshotService: ClosePositionSnapshotService,
    private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
    private readonly profitabilityMathService: ProfitabilityMathService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    private readonly eventEmitter: EventEmitter2,
    ) {
        super()
    }

    async process(job: Job<ClosePositionConfirmationPayload>) {
        const { bot, txHash, state, prevChain } = job.data
        let { targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount } =
      job.data
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id,
                "Active position not found",
            )
        }
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
        const targetIsA =
      bot.targetToken.toString() === state.static.tokenA.toString()
        const targetToken = targetIsA ? tokenA : tokenB
        const quoteToken = targetIsA ? tokenB : tokenA
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
        if (!targetBalanceAmount || !quoteBalanceAmount || !gasBalanceAmount) {
            const {
                targetBalanceAmount: fetchedTargetBalanceAmount,
                quoteBalanceAmount: fetchedQuoteBalanceAmount,
                gasBalanceAmount: fetchedGasBalanceAmount,
            } = await this.balanceService.fetchBalances({
                bot,
            })
            targetBalanceAmount = fetchedTargetBalanceAmount.toString()
            quoteBalanceAmount = fetchedQuoteBalanceAmount.toString()
            gasBalanceAmount = fetchedGasBalanceAmount.toString()
        }
        const targetBalanceAmountBN = new BN(targetBalanceAmount)
        const quoteBalanceAmountBN = new BN(quoteBalanceAmount)
        const gasBalanceAmountBN = new BN(gasBalanceAmount)

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
        const { roi, pnl } =
      await this.profitabilityMathService.calculateProfitability({
          before,
          after,
          targetTokenId: targetToken.displayId,
          quoteTokenId: quoteToken.displayId,
          chainId: bot.chainId,
      })
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            if (!bot.activePosition) {
                throw new ActivePositionNotFoundException(
                    bot.id,
                    "Active position not found",
                )
            }
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: targetBalanceAmountBN || new BN(0),
                quoteBalanceAmount: quoteBalanceAmountBN || new BN(0),
                gasBalanceAmount: gasBalanceAmountBN || new BN(0),
                session,
            })
            await this.closePositionSnapshotService.updateClosePositionTransactionRecord(
                {
                    bot,
                    pnl,
                    roi,
                    positionId: bot.activePosition.id,
                    closeTxHash: txHash,
                    session,
                    snapshotTargetBalanceAmountAfterClose: new BN(targetBalanceAmountBN || 0,),
                    snapshotQuoteBalanceAmountAfterClose: new BN(quoteBalanceAmountBN || 0,),
                    snapshotGasBalanceAmountAfterClose: new BN(gasBalanceAmountBN || 0,),
                },
            )
            if (prevChain) {
                await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                    bot,
                    txHash: prevChain.txHash,
                    amountIn: new BN(prevChain.amountIn),
                    tokenInId: prevChain.tokenInId,
                    tokenOutId: prevChain.tokenOutId,
                    session,
                })
            }

            // Emit events for other parts of the system to react to
            this.eventEmitter.emit(
                createEventName(EventName.UpdateActiveBot, { botId: bot.id }),
            )
            this.eventEmitter.emit(
                createEventName(EventName.PositionClosed, { botId: bot.id }),
            )

            // Release the distributed lock after processing the position
            await this.redlockService.releaseIfAcquired({
                botId: bot.id,
                redlockKey: RedlockKey.Action,
            })

            // Log successful processing
            this.logger.verbose(WinstonLog.ClosePositionConfirmationSuccess, {
                botId: bot.id,
                positionId: bot.activePosition.id,
            })
        })
    }

  /**
   * Event handler triggered when a job fails.
   * Handles releasing the distributed lock and logging the failure.
   */
  @OnWorkerEvent("failed")
    async onFailed(job: Job<ClosePositionConfirmationPayload>, error: Error) {
        const { bot, txHash } = job.data
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                job.data.bot.id,
                "Active position not found",
            )
        }
        this.logger.error(WinstonLog.ClosePositionConfirmationFailed, {
            botId: bot.id,
            positionId: bot.activePosition?.id,
            txHash,
            error: error.message,
            stack: error.stack,
        })
    }
}

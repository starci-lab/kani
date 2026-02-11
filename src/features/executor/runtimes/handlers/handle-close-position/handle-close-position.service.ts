import {
    Injectable 
} from "@nestjs/common"
import {
    LockAuthorityService,
} from "../../../bussiness"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    Types 
} from "mongoose"
import {
    ClosePositionEnqueueService,
    LiquidityPoolStateService,
    SettlementService
} from "@modules/blockchains"
import {
    PositionAssociateService 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    WaitService
} from "@modules/mixin"
import {
    InjectQueue
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName
} from "@modules/bullmq"
import {
    Queue
} from "bullmq"
import type {
    HandleClosePositionParams,
} from "./types"

/**
 * Runtime service for scheduling close-position jobs.
 *
 * @example
 * await handleClosePositionService.process({ bot, liquidityPool, eventPayload })
 */
@Injectable()
export class HandleClosePositionService {
    constructor(
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly settlementService: SettlementService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly positionAssociateService: PositionAssociateService,
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<string>,
    ) {}
    /**
     * Process close-position request for the given bot and liquidity pool.
     *
     * @param params - Handle close position params (bot, liquidityPool, eventPayload)
     * @returns void
     *
     * @example
     * await handleClosePositionService.process({ bot, liquidityPool, eventPayload })
     */
    async process(
        {
            bot,
            liquidityPool,
            eventPayload,
        }: HandleClosePositionParams
    ) {
        // Skip if bot has no active position to close
        if (!bot.activePosition) {
            this.winstonService.log(
                WinstonLog.ClosePositionSkippedBotHasNoActivePosition,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        if (bot.activeJob) {
            this.winstonService.log(
                WinstonLog.ClosePositionSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        await this.positionAssociateService.associateActivePosition({
            bot 
        })
        const jobId = new Types.ObjectId().toString()
        // Settle the position to determine if we should close
        const state = eventPayload ?? await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
        const { 
            settled, 
            strategyResults 
        } = await this.settlementService.settle(
            {
                bot,
                liquidityPool,
                state,
            }
        )
        if (
            !settled && !bot.activePosition?.forceClose 
            && envConfig().executor.runtime.operation.closePosition.settle.enabled
        ) {
            this.winstonService.log(
                WinstonLog.CannotSettlePosition,
                {
                    botId: bot.id,
                    jobId,
                    liquidityPoolId: liquidityPool.displayId,
                    strategyResults,
                }
            )
            return
        }
        // Wait to ensure no job for this bot is already in the queue
        const noActiveJobFound = await this.waitService.wait(
            {
                action: async () => {
                    const job = await this.closePositionQueue.getJob(bot.id)
                    return !job
                }
            }
        )
        if (!noActiveJobFound) {
            this.winstonService.log(
                WinstonLog.ClosePositionSkippedActiveJobFoundInQueue,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Acquire lock authority; return if not acquired
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) {
            this.winstonService.log(
                WinstonLog.ClosePositionLockAuthorityNotAcquired,
                {
                    botId: bot.id,
                }
            )
            return
        }
        // Enqueue the close-position job
        try {
            const bullmqJob = await this.closePositionEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    isRetry: false,
                    liquidityPool,
                    state,
                }
            )
            this.winstonService.log(
                WinstonLog.ClosePositionJobEnqueued,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobEnqueueFailed,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId,
                    error: error.message,
                }
            )
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}
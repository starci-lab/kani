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
    JobType,
    ActivePositionAssociateService,
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
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
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
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
        }: HandleClosePositionParams
    ) {
       
        // Skip if bot has no active position to close
        if (!bot.activePosition) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Associate the active position
        await this
            .activePositionAssociateService
            .attachAssociatedPositionsToBotActivePositions(
                {
                    bots: [bot],
                }
            )
        // Settle the position to determine if we should close
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
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
                WinstonLog.JobSkippedCannotSettlePosition,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    type: JobType.ClosePosition,
                    strategyResults,
                }
            )
            return
        }
        // Ensure no job for this bot is already in the queue
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                    bullmqJobId: bullmqJob.id ?? "",
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
                WinstonLog.JobSkippedAuthorityNotAcquired,
                {
                    botId: bot.id,
                    jobId: bot.activeJob?.job?.toString() ?? "",
                    type: JobType.ClosePosition,
                }
            )
            return
        }
        // Enqueue the close-position job
        try {
            const jobId = new Types.ObjectId().toString()
            await this.closePositionEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    isRetry: false,
                    liquidityPool,
                }
            )
            this.winstonService.log(
                WinstonLog.JobEnqueued,
                {
                    botId: bot.id,
                    jobId,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.JobEnqueueFailed,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    type: JobType.ClosePosition,
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
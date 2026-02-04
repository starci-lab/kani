import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema, 
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    LockAuthorityService 
} from "../../bussiness"
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
} from "@modules/blockchains"
import {
    LiquidityPoolsSyncedEventPayload 
} from "@modules/event"
import {
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

export interface HandleClosePositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    eventPayload?: LiquidityPoolsSyncedEventPayload
}
@Injectable()
export class HandleClosePositionService {
    /**
     * Runtime entrypoint for scheduling an "close position" job for a bot.
     *
     * This service is called by event adapters (CLMM/DLMM) when a liquidity pool signals
     * that a position should be closed.
     *
     * Responsibilities:
     * - Guard against invalid bot states (not running / already in position / already has active job)
     * - Acquire lock authority (single-writer) before enqueuing work
     * - Resolve the requested liquidity pool from memory storage
     * - Enqueue a BullMQ `ClosePosition` job via `ClosePositionOrchestratorService`
     * - Log enqueue success/failure and release lock on enqueue failure
     */
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
     * Handles an close-position request for the given bot and event payload.
     *
     * Side effects:
     * - Acquires lock authority (Redis)
     * - Enqueues a BullMQ job
     * - Logs via Winston
     * - Releases lock authority if enqueue fails
     */
    async process(
        {
            bot,
            liquidityPool,
            eventPayload,
        }: HandleClosePositionParams
    ) {
        // run even if the bot is not running
        // // we do nothing if the bot is not running
        // if (!bot.running) return
        // we do nothing if the bot has an active position
        if (!bot.activePosition) return
        if (bot.activeJob) {
            return
        }
        await this.positionAssociateService.associateActivePosition(bot)
        const jobId = new Types.ObjectId().toString()
        // settle the position
        const { settled, strategyResults } = await this.settlementService.settle(
            {
                bot,
                state: {
                    static: liquidityPool,
                    dynamic: eventPayload ?? await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool),
                },
            }
        )
        if (!settled && envConfig().executor.runtime.operation.closePosition.settle.enabled) {
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
        // we wait for ensure no active job for the bot
        const noActiveJobFound = await this.waitService.wait(
            {
                action: async () => {
                    const job = await this.closePositionQueue.getJob(bot.id)
                    return !job
                }
            }
        )
        if (!noActiveJobFound) return
        // check if the bot has an active job
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) return
        // settle the position
        // enqueue the close position
        try {
            const bullmqJob = await this.closePositionEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    isRetry: false,
                    liquidityPool,
                    dynamicLiquidityPoolInfo: eventPayload
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
            await this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}
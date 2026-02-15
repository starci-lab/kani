import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    JobType,
} from "@modules/databases"
import {
    WithdrawEnqueueService
} from "@modules/blockchains"
import {
    LockAuthorityService 
} from "../../../bussiness"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    Types 
} from "mongoose"
import {
    WaitService
} from "@modules/mixin"
import {
    CacheService,
    CacheKey,
} from "@modules/cache"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    Queue 
} from "bullmq"
import {
    BullQueueName, bullData
} from "@modules/bullmq"

/**
 * Runtime service for scheduling withdraw jobs.
 *
 * @example
 * await handleWithdrawService.process(bot)
 */
@Injectable()
export class HandleWithdrawService {
    constructor(
        private readonly withdrawEnqueueService: WithdrawEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Schedule withdraw work for the given bot.
     *
     * @param bot - Bot schema
     * @returns void
     *
     * @example
     * await handleWithdrawService.process(bot)
     */
    async process(
        bot: BotSchema
    ) {
        // Check if withdraw is already scheduled (cached tokenInputs for this bot)
        const payload = await this.cacheService.get(
            {
                key: CacheKey.Withdraw,
                args: [bot.id],
            }
        )
        if (!payload) {
            this.winstonService.log(
                WinstonLog.JobSkippedNoPayload,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                }
            )
            return
        }
        
        // Skip if bot is running
        if (bot.running) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotRunning,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                }
            )
            return
        }
        // Skip if bot has an active position
        if (bot.activePosition) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                }
            )
            return
        }
        // Skip if bot already has an active job
        if (bot.activeJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    jobId: bot.activeJob.job.toString(),
                    type: JobType.Withdraw,
                }
            )
            return
        }

        // Wait to ensure no job for this bot is already in the queue
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    bullmqJobId: bullmqJob.id ?? "",
                    type: JobType.Withdraw,
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
        if (!acquired) return
        const jobId = new Types.ObjectId().toString()
        // Enqueue the withdraw job
        try {
            await this.withdrawEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                }
            )
            this.winstonService.log(
                WinstonLog.JobEnqueued,
                {
                    botId: bot.id,
                    jobId,
                    type: JobType.Withdraw,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.JobEnqueueFailed,
                {
                    botId: bot.id,
                    error: error.message,
                    jobId,
                    type: JobType.Withdraw,
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
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
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
        @InjectQueue(bullData[BullQueueName.Withdraw].name)
        private readonly withdrawQueue: Queue<string>,
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
            return
        }
        
        // Skip if bot is running
        if (bot.running) return
        // Skip if bot has an active position
        if (bot.activePosition) return
        // Skip if bot already has an active job
        if (bot.activeJob) {
            return
        }

        // Wait to ensure no job for this bot is already in the queue
        const noActiveJobFound = await this.waitService.wait(
            {
                action: async () => {
                    const job = await this.withdrawQueue.getJob(bot.id)
                    return !job
                }
            }
        )
        if (!noActiveJobFound) return
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
            const bullmqJob = await this.withdrawEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    payload,
                }
            )
            this.winstonService.log(
                WinstonLog.WithdrawJobEnqueued,
                {
                    jobId,
                    botId: bot.id,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.WithdrawJobEnqueueFailed,
                {
                    botId: bot.id,
                    error: error.message,
                    jobId,
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
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    WithdrawEnqueueService,
    BalanceWithdrawTokenInput,
} from "@modules/blockchains"
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
    WaitService
} from "@modules/mixin"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    Queue 
} from "bullmq"
import {
    BullQueueName, bullData
} from "@modules/bullmq"

@Injectable()
export class HandleWithdrawService {
    /**
     * Runtime entrypoint for scheduling a "withdraw" job for a bot.
     *
     * Responsibilities:
     * - Guard against invalid bot states (not running / has active position / already has active job)
     * - Acquire lock authority (single-writer) before enqueuing work
     * - Enqueue a BullMQ `Withdraw` job via `WithdrawEnqueueService.enqueue`
     * - Log enqueue success/failure and release lock on enqueue failure
     */
    constructor(
        private readonly withdrawEnqueueService: WithdrawEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.Withdraw].name)
        private readonly withdrawQueue: Queue<string>,
    ) {}

    /**
     * Schedules withdraw work for the given bot.
     *
     * Side effects:
     * - Acquires lock authority (Redis)
     * - Enqueues a BullMQ job
     * - Logs via Winston
     * - Releases lock authority if enqueue fails
     */
    async process(
        bot: BotSchema,
        tokenInputs: Array<BalanceWithdrawTokenInput>,
    ) {
        // Acquire lock authority; return if not acquired
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) return
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
        const jobId = new Types.ObjectId().toString()
        // Enqueue the withdraw job
        try {
            const bullmqJob = await this.withdrawEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    tokenInputs,
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
            await this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}
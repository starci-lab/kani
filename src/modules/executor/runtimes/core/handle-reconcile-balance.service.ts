import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    ReconcileBalanceEnqueueService 
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
    DayjsService,
    WaitService
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
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
export class HandleReconcileBalanceService {
    /**
     * Runtime entrypoint for scheduling a "reconcile balance" job for a bot.
     *
     * Responsibilities:
     * - Guard against invalid bot states (not running / has active position / already has active job)
     * - Acquire lock authority (single-writer) before enqueuing work
     * - Enqueue a BullMQ `ReconcileBalance` job via `ReconcileBalanceEnqueueService.enqueue`
     * - Log enqueue success/failure and release lock on enqueue failure
     */
    constructor(
        private readonly reconcileBalanceEnqueueService: ReconcileBalanceEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<string>,
    ) {}

    /**
     * Schedules reconcile-balance work for the given bot.
     *
     * Side effects:
     * - Acquires lock authority (Redis)
     * - Enqueues a BullMQ job
     * - Logs via Winston
     * - Releases lock authority if enqueue fails
     */
    async process(
        bot: BotSchema,
    ) {
        // Skip if bot is not running
        if (!bot.running) return
        // Skip if bot has an active position
        if (bot.activePosition) return
        // Skip if balance snapshot is within cooldown (avoid rescan too soon)
        if (bot.balanceSnapshots?.snapshotAt) {
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond"
            )
            if (diffMs <= envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                return
            }
        }
        // Skip if bot already has an active job
        if (bot.activeJob) {
            return
        }
        // Wait to ensure no job for this bot is already in the queue
        const noActiveJobFound = await this.waitService.wait(
            {
                action: async () => {
                    const job = await this.reconcileBalanceQueue.getJob(bot.id)
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
        // Enqueue the reconcile-balance job
        try {
            const bullmqJob = await this.reconcileBalanceEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                }
            )
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobEnqueued,
                {
                    jobId,
                    botId: bot.id,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobEnqueueFailed,
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
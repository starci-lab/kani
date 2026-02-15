import {
    Injectable,
} from "@nestjs/common"
import {
    JobType,
    type BotSchema,
} from "@modules/databases"
import {
    ReconcileBalanceEnqueueService,
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
    DayjsService,
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

/**
 * Runtime service for scheduling reconcile-balance jobs.
 *
 * @example
 * await handleReconcileBalanceService.process(bot)
 */
@Injectable()
export class HandleReconcileBalanceService {
    constructor(
        private readonly reconcileBalanceEnqueueService: ReconcileBalanceEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
    ) {}

    /**
     * Schedule reconcile-balance work for the given bot.
     *
     * @param bot - Bot schema
     * @returns void
     *
     * @example
     * await handleReconcileBalanceService.process(bot)
     */
    async process(
        bot: BotSchema,
    ) {
        // Skip if bot is not running
        if (!bot.running) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotRunning,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
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
                    type: JobType.ReconcileBalance,
                }
            )
            return
        }
        // Skip if balance snapshot is within cooldown (avoid rescan too soon)
        if (bot.balanceSnapshots?.snapshotAt) {
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond"
            )
            if (diffMs <= envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                this.winstonService.log(
                    WinstonLog.JobSkippedBotBalanceSnapshotWithinCooldown,
                    {
                        botId: bot.id,
                        type: JobType.ReconcileBalance,
                    }
                )
                return
            }
        }
        // Wait to ensure no job for this bot is already in the queue
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
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
                    type: JobType.ReconcileBalance,
                }
            )
            return
        }
        // Enqueue the reconcile-balance job
        try {
            // Create job ID
            const jobId = new Types.ObjectId().toString()
            await this.reconcileBalanceEnqueueService.enqueue(
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
                    type: JobType.ReconcileBalance,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.JobEnqueueFailed,
                {
                    botId: bot.id,
                    error: error.message,
                    type: JobType.ReconcileBalance,
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
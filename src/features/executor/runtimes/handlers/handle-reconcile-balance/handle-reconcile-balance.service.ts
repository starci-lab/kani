import {
    Injectable,
} from "@nestjs/common"
import type {
    BotSchema,
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
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<string>,
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
                WinstonLog.ReconcileBalanceSkippedBotNotRunning,
                {
                    botId: bot.id,
                }
            )
            return
        }
        // Skip if bot has an active position
        if (bot.activePosition) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
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
                    WinstonLog.ReconcileBalanceSkippedBalanceSnapshotWithinCooldown,
                    {
                        botId: bot.id,
                    }
                )
                return
            }
        }
        // Skip if bot already has an active job
        if (bot.activeJob) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                }
            )
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
        if (!noActiveJobFound) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceSkippedActiveJobFoundInQueue,
                {
                    botId: bot.id,
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
                WinstonLog.ReconcileBalanceLockAuthorityNotAcquired,
                {
                    botId: bot.id,
                }
            )
            return
        }
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
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}
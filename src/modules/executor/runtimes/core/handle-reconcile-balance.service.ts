import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    BalanceEnqueueService 
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
    DayjsService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class HandleReconcileBalanceService {
    /**
     * Runtime entrypoint for scheduling a "reconcile balance" job for a bot.
     *
     * Responsibilities:
     * - Guard against invalid bot states (not running / has active position / already has active job)
     * - Acquire lock authority (single-writer) before enqueuing work
     * - Enqueue a BullMQ `ReconcileBalance` job via `BalanceService.enqueue`
     * - Log enqueue success/failure and release lock on enqueue failure
     */
    constructor(
        private readonly balanceEnqueueService: BalanceEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
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
        // we do nothing if the bot is not running
        if (!bot.running) return
        // we do nothing if the bot has an active position
        if (bot.activePosition) return
        if (bot.activeJob) {
            return
        }
        if (bot.balanceSnapshots?.snapshotAt) {
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond"
            )
            if (diffMs <= envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                return
            }
        }
        const jobId = new Types.ObjectId().toString()
        // check if the bot has an active job
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) return
        // enqueue the balance rebalancing
        try {
            const bullmqJob = await this.balanceEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                }
            )
            this.winstonService.log(
                WinstonLog.ReconcileBalanceEnqueued,
                {
                    jobId,
                    botId: bot.id,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceEnqueueFailed,
                {
                    botId: bot.id,
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
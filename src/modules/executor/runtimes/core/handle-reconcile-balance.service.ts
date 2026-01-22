import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    BalanceService 
} from "@modules/blockchains"
import {
    LockAuthorityService 
} from "./lock-authority.service"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    Types 
} from "mongoose"

@Injectable()
export class HandleReconcileBalanceService {
    constructor(
        private readonly balanceService: BalanceService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
    ) {}

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
            const bullmqJob = await this.balanceService.enqueue(
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
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}
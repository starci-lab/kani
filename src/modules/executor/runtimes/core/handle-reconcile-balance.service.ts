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
        const acquired = await this.lockAuthorityService.acquire(bot)
        if (!acquired) return
        // enqueue the balance rebalancing
        try {
            await this.balanceService.enqueue(
                {
                    bot,
                }
            )
            this.winstonService.log(
                WinstonLog.ReconcileBalanceEnqueued,
                {
                    botId: bot.id,
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
            this.lockAuthorityService.release(bot)
        }
    }
}
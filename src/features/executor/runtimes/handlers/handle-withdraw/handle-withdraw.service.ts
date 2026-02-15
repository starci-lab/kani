import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
} from "@modules/databases"
import {
    WithdrawEnqueueService
} from "@modules/blockchains"
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
        await this.withdrawEnqueueService.enqueue(
            {
                bot
            }
        )
    }
}
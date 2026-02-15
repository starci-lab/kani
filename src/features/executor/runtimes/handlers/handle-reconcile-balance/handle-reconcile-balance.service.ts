import {
    Injectable,
} from "@nestjs/common"
import {
    ReconcileBalanceEnqueueService,
} from "@modules/blockchains"
import {
    BotSchema 
} from "@modules/databases"
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
        await this.reconcileBalanceEnqueueService.enqueue(
            {
                bot,
            }
        )
    }


}
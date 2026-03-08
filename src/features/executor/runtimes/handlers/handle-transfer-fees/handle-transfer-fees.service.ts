import {
    Injectable,
} from "@nestjs/common"
import type {
    BotSchema,
} from "@modules/databases"
import {
    TransferFeesEnqueueService,
} from "@modules/blockchains"

/**
 * Runtime service for scheduling transfer-fees jobs.
 *
 * @example
 * const service = new HandleTransferFeesService(transferFeesEnqueueService)
 * await service.process(bot)
 */
@Injectable()
export class HandleTransferFeesService {
    constructor(
        private readonly transferFeesEnqueueService: TransferFeesEnqueueService,
    ) {}

    /**
     * Schedule transfer-fees work for the given bot.
     *
     * @param bot - Bot schema
     * @returns void
     *
     * @example
     * await handleTransferFeesService.process(bot)
     */
    async process(
        bot: BotSchema,
    ) {
        // enqueue transfer fees job
        await this.transferFeesEnqueueService.enqueue({
            bot,
        })
    }
}
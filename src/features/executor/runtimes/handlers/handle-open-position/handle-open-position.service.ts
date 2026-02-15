import {
    Injectable 
} from "@nestjs/common"
import type {
    HandleOpenPositionParams,
} from "./types"
import {
    OpenPositionEnqueueService 
} from "@modules/blockchains"

/**
 * Runtime service for scheduling open-position jobs.
 *
 * @example
 * await handleOpenPositionService.process({ bot, liquidityPool, eventPayload })
 */
@Injectable()
export class HandleOpenPositionService {
    constructor(
        private readonly openPositionEnqueueService: OpenPositionEnqueueService,
    ) {}

    /**
     * Process open-position request for the given bot and liquidity pool.
     *
     * @param params - Handle open position params (bot, liquidityPool, eventPayload)
     * @returns void
     *
     * @example
     * await handleOpenPositionService.process({ bot, liquidityPool, eventPayload })
     */
    async process(
        {
            bot,
            liquidityPool,
        }: HandleOpenPositionParams
    ) {
        await this.openPositionEnqueueService.enqueue(
            {
                bot,
                liquidityPool,
            }
        )   
    }
}
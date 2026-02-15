import {
    Injectable 
} from "@nestjs/common"
import type {
    HandleClosePositionParams,
} from "./types"
import {
    ClosePositionEnqueueService 
} from "@modules/blockchains"

/**
 * Runtime service for scheduling close-position jobs.
 *
 * @example
 * await handleClosePositionService.process({ bot, liquidityPool, eventPayload })
 */
@Injectable()
export class HandleClosePositionService {
    constructor(
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
    ) {}
    /**
     * Process close-position request for the given bot and liquidity pool.
     *
     * @param params - Handle close position params (bot, liquidityPool, eventPayload)
     * @returns void
     *
     * @example
     * await handleClosePositionService.process({ bot, liquidityPool, eventPayload })
     */
    async process(
        {
            bot,
            liquidityPool,
        }: HandleClosePositionParams
    ) {
        await this.closePositionEnqueueService.enqueue(
            {
                bot,
                liquidityPool,
            }
        )
    }
}
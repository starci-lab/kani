import type {
    DlmmPositionCloseRequestedEventPayload,
} from "@modules/event"
import {
    Injectable,
} from "@nestjs/common"
import {
    BotSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    HandleClosePositionService,
} from "./handle-close-position.service"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Adapter for DLMM position close requested events.
 *
 * @example
 * await handleDlmmPositionCloseRequestedEventService.process(bot, event)
 */
@Injectable()
export class HandleDlmmPositionCloseRequestedEventService {
    constructor(
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Route DLMM close-position event to the generic close-position handler.
     *
     * @param bot - Bot schema
     * @param event - DLMM position close requested event payload
     * @returns void
     */
    async process(
        bot: BotSchema,
        event: DlmmPositionCloseRequestedEventPayload,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(event.id)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: event.id,
            })
        }   
        await this.handleClosePositionService.process(
            {
                bot,
                liquidityPool,
            }
        )
    }
}
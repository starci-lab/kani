import type {
    ClmmPositionCloseRequestedEventPayload,
} from "@modules/event"
import {
    Injectable,
} from "@nestjs/common"
import type {
    BotSchema,
} from "@modules/databases"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    HandleClosePositionService 
} from "./handle-close-position.service"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Adapter for CLMM position close requested events.
 *
 * @example
 * await handleClmmPositionCloseRequestedEventService.process(bot, eventPayload)
 */
@Injectable()
export class HandleClmmPositionCloseRequestedEventService {
    constructor(
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Route CLMM close-position event to the generic close-position handler.
     *
     * @param bot - Bot schema
     * @param eventPayload - CLMM position close requested event payload
     * @returns void
     */
    process(
        bot: BotSchema,
        eventPayload: ClmmPositionCloseRequestedEventPayload,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(eventPayload.id)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: eventPayload.id,
            })
        }   
        this.handleClosePositionService.process(
            {
                bot,
                liquidityPool,
            }
        )
    }
}
import type {
    ClmmPositionOpenRequestedEventPayload,
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
    HandleOpenPositionService 
} from "./handle-open-position.service"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Adapter for CLMM position open requested events.
 *
 * @example
 * await handleClmmPositionOpenRequestedEventService.process(bot, eventPayload)
 */
@Injectable()
export class HandleClmmPositionOpenRequestedEventService {
    constructor(
        private readonly handleOpenPositionService: HandleOpenPositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}
    /**
     * Route CLMM open-position event to the generic open-position handler.
     *
     * @param bot - Bot schema
     * @param eventPayload - CLMM position open requested event payload
     * @returns void
     */
    async process(
        bot: BotSchema,
        eventPayload: ClmmPositionOpenRequestedEventPayload,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(eventPayload.id)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: eventPayload.id,
            })
        }   
        await this.handleOpenPositionService.process(
            {
                bot,
                liquidityPool,
            }
        )
    }
}
import type {
    DlmmPositionOpenRequestedEventPayload,
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
    HandleOpenPositionService,
} from "./handle-open-position.service"
import {
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"

/**
 * Adapter for DLMM position open requested events.
 *
 * @example
 * await handleDlmmPositionOpenRequestedEventService.process(bot, event)
 */
@Injectable()
export class HandleDlmmPositionOpenRequestedEventService {
    /**
     * Adapter for DLMM "position open requested" events.
     *
     * Responsibilities:
     * - Bridge the DLMM-specific event type into the shared `HandleOpenPositionService`.
     * - Keep this handler thin (no business logic here).
     */
    constructor(
        private readonly handleOpenPositionService: HandleOpenPositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Route DLMM open-position event to the generic open-position handler.
     *
     * @param bot - Bot schema
     * @param event - DLMM position open requested event payload
     * @returns void
     */
    process(
        bot: BotSchema,
        event: DlmmPositionOpenRequestedEventPayload,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
            {
                id: {
                    $eq: event.id,
                }
            }
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: event.id,
            })
        }   
        this.handleOpenPositionService.process(
            {
                bot,
                liquidityPool,
            }
        )
    }
}
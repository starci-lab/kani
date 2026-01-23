import {
    ClmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    HandleOpenPositionService 
} from "./handle-open-position.service"

@Injectable()
export class HandleClmmPositionOpenRequestedEventService {
    /**
     * Adapter for CLMM "position open requested" events.
     *
     * Responsibility:
     * - Bridge the CLMM-specific event type into the shared `HandleOpenPositionService`.
     * - Keep this handler thin (no business logic here).
     */
    constructor(
        private readonly handleOpenPositionService: HandleOpenPositionService,
    ) {}

    /**
     * Routes the CLMM open-position event to the generic open-position handler.
     */
    process(
        bot: BotSchema,
        event: ClmmPositionOpenRequestedEventPayload,
    ) {
        this.handleOpenPositionService.process(
            bot,
            event
        )
    }
}
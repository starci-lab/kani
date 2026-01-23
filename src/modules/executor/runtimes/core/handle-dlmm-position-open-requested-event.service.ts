import {
    DlmmPositionOpenRequestedEventPayload 
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
export class HandleDlmmPositionOpenRequestedEventService {
    /**
     * Adapter for DLMM "position open requested" events.
     *
     * Responsibility:
     * - Bridge the DLMM-specific event type into the shared `HandleOpenPositionService`.
     * - Keep this handler thin (no business logic here).
     */
    constructor(
        private readonly handleOpenPositionService: HandleOpenPositionService,
    ) {}

    /**
     * Routes the DLMM open-position event to the generic open-position handler.
     */
    process(
        bot: BotSchema,
        event: DlmmPositionOpenRequestedEventPayload,
    ) {
        this.handleOpenPositionService.process(
            bot,
            event
        )
    }
}
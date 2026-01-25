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
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"
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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Routes the DLMM open-position event to the generic open-position handler.
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
                eventPayload: event,
            }
        )
    }
}
import {
    DlmmPositionCloseRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema 
} from "@modules/databases"
import {
    HandleClosePositionService 
} from "./handle-close-position.service"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

@Injectable()
export class HandleDlmmPositionCloseRequestedEventService {
    /**
     * Adapter for DLMM "position close requested" events.
     *
     * Responsibility:
     * - Bridge the DLMM-specific event type into the shared `HandleClosePositionService`.
     * - Keep this handler thin (no business logic here).
     */
    constructor(
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Routes the DLMM close-position event to the generic close-position handler.
     */
    process(
        bot: BotSchema,
        event: DlmmPositionCloseRequestedEventPayload,
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
        this.handleClosePositionService.process(
            {
                bot,
                liquidityPool,
                eventPayload: event,
            }
        )
    }
}
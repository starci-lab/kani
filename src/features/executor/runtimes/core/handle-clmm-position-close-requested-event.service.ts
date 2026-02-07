import {
    ClmmPositionCloseRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    HandleClosePositionService 
} from "./handle-close-position.service"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

@Injectable()
export class HandleClmmPositionCloseRequestedEventService {
    /**
     * Adapter for CLMM "position close requested" events.
     *
     * Responsibilities:
     * - Bridge the CLMM-specific event type into the shared `HandleClosePositionService`.
     * - Keep this handler thin (no business logic here).
     */
    constructor(
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Routes the CLMM close-position event to the generic close-position handler.
     */
    process(
        bot: BotSchema,
        eventPayload: ClmmPositionCloseRequestedEventPayload,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
            {
                id: {
                    $eq: eventPayload.id,
                }
            }
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: eventPayload.id,
            })
        }   
        this.handleClosePositionService.process(
            {
                bot,
                liquidityPool,
                eventPayload,
            }
        )
    }
}
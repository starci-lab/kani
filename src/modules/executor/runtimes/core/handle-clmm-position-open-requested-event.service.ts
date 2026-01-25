import {
    ClmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    HandleOpenPositionService 
} from "./handle-open-position.service"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}
    /**
     * Routes the CLMM open-position event to the generic open-position handler.
     */
    process(
        bot: BotSchema,
        eventPayload: ClmmPositionOpenRequestedEventPayload,
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
        this.handleOpenPositionService.process(
            {
                bot,
                liquidityPool,
                eventPayload,
            }
        )
    }
}
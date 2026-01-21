import {
    EventName, 
    DlmmLiquidityPoolsSyncedEventPayload,
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventEmitterService 
} from "@modules/event"
import {
    LiquidityPoolAssignmentsRotationService 
} from "./liquidity-pool-assignments-rotation.service"

@Injectable()
export class DlmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly liquidityPoolAssignmentsRotationService: LiquidityPoolAssignmentsRotationService,
    ) {}

   /**
     * Triggered when DLMM liquidity pools are fetched.
     *
     * Intent:
     * - Fan-out the opportunity to close positions
     * - Bots are currently IDLE (no active liquidity pool)
     *
     * Pattern:
     * - BROADCAST (not load-balancing)
     * - Deterministic fan-out
     */
   @OnEvent(EventName.DlmmLiquidityPoolsSynced)
    async handleDlmmLiquidityPoolsSynced(
        event: DlmmLiquidityPoolsSyncedEventPayload
    ) {
        // Select bots that are currently idle and associated with THIS DLMM pool
        const idleDlmmBots =
            this.liquidityPoolAssignmentsRotationService.botAssignmentsCollection.find()
                .filter((bot) => !bot.activePosition)
                .filter((bot) => bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === event.id))
        // Broadcast close-position request to all idle bots on this pool.
        // No round-robin: each bot owns and closes its own position.
        for (const bot of idleDlmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.DlmmPositionCloseRequested,
                    args: [bot.id],
                    payload: {
                        bot,
                        payload: event
                    },
                }
            )
        }
    }
}
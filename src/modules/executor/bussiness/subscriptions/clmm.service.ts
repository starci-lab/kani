import {
    EventName, 
    ClmmLiquidityPoolsSyncedEventPayload
} from "@modules/event"
import {
    BotsLoaderService 
} from "../../loaders"
import {
    Injectable 
} from "@nestjs/common"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventEmitterService 
} from "@modules/event"

@Injectable()
export class ClmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly botsLoaderService: BotsLoaderService,
    ) {}
    
    /**
     * Triggered when CLMM liquidity pools are fetched.
     *
     * Intent:
     * - Fan-out the opportunity to open positions
     * - Bots are currently IDLE (no active liquidity pool)
     *
     * Pattern:
     * - BROADCAST (not load-balancing)
     * - Deterministic fan-out
     */
    @OnEvent(EventName.ClmmLiquidityPoolsSynced)
    async handleClmmLiquidityPoolsSynced(
        event: ClmmLiquidityPoolsSyncedEventPayload
    ) {
        // Select bots that are currently idle and associated with THIS CLMM pool
        const idleClmmBots = Array.from(
            this.botsLoaderService.bots.values()
        )
            .filter(
                (bot) => !bot.activePosition
                && bot.liquidityPools.some(
                    (liquidityPool) => liquidityPool?.toString() === event.id
                )
            )

        // Broadcast open-position request to all idle bots on this pool.
        // No round-robin: each bot owns and opens its own position.
        for (const bot of idleClmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.ClmmPositionOpenRequested,
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
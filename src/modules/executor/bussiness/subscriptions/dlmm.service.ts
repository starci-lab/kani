import {
    EventName, 
    DlmmLiquidityPoolsSyncedEventPayload,
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
export class DlmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly botsLoaderService: BotsLoaderService,
    ) {}

    /**
     * Triggered when DLMM liquidity pools are fetched.
     *
     * Intent:
     * - Notify ALL bots that are CURRENTLY ACTIVE on this DLMM pool
     * - Each bot is responsible for closing its OWN position
     *
     * Pattern:
     * - BROADCAST (not load-balancing)
     * - Deterministic fan-out
     */
    @OnEvent(EventName.DlmmLiquidityPoolsSynced)
    async handleDlmmLiquidityPoolsFetched(
        event: DlmmLiquidityPoolsSyncedEventPayload
    ) {
        // Select bots that are actively running on THIS DLMM pool
        const activeDlmmBots = Array.from(this.botsLoaderService.bots.values())
            .filter(
                (bot) =>
                    bot.activePosition &&
                    bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === event.id)
            )

        // Broadcast close-position request to ALL active bots on this pool.
        // No round-robin: each bot owns and closes its own position.
        for (const bot of activeDlmmBots) {
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
import { createEventName, ClmmLiquidityPoolsFetchedEvent, EventName } from "@modules/event"
import { BotsLoaderService } from "../../loaders"
import { Injectable } from "@nestjs/common"
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import { createObjectId } from "@utils"

@Injectable()
export class ClmmSubscriptionService {
    constructor(
        private readonly eventEmitter: EventEmitter2,
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
    @OnEvent(EventName.ClmmLiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: ClmmLiquidityPoolsFetchedEvent
    ) {
        // Select bots that are currently idle and associated with THIS CLMM pool
        const idleClmmBots = Array.from(this.botsLoaderService.bots.values())
            .filter(
                (bot) => !bot.activeLiquidityPoolType
                && bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === createObjectId(event.liquidityPoolId).toString())
            )

        // Broadcast open-position request to all idle bots on this pool.
        // No round-robin: each bot owns and opens its own position.
        for (const bot of idleClmmBots) {
            this.eventEmitter.emit(
                createEventName(
                    EventName.ClmmPositionOpenRequested,
                    { id: bot.id }
                ),
                event
            )
        }
    }
}
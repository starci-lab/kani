import { ClmmLiquidityPoolsFetchedEvent, createEventName, DlmmLiquidityPoolsFetchedEvent, EventName } from "@modules/event"
import { BotsLoaderService } from "../../loaders"
import { Injectable } from "@nestjs/common"
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import { LiquidityPoolType } from "@modules/databases"
import { createObjectId } from "@utils"

@Injectable()
export class DlmmSubscriptionService {
    constructor(
        private readonly eventEmitter: EventEmitter2,
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
    @OnEvent(EventName.DlmmLiquidityPoolsFetched)
    async handleDlmmLiquidityPoolsFetched(
        event: DlmmLiquidityPoolsFetchedEvent
    ) {
        // Select bots that are actively running on THIS DLMM pool
        const activeDlmmBots = Array.from(this.botsLoaderService.bots.values())
            .filter(
                (bot) =>
                    bot.activeLiquidityPoolType === LiquidityPoolType.Dlmm &&
                    bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === createObjectId(event.liquidityPoolId).toString())
            )

        // Broadcast close-position request to ALL active bots on this pool.
        // No round-robin: each bot owns and closes its own position.
        for (const bot of activeDlmmBots) {
            this.eventEmitter.emit(
                createEventName(
                    EventName.DlmmPositionCloseRequested,
                    { id: bot.id }
                ),
                event
            )
        }
    }

    /**
     * Broadcast close-position request to bots that:
     * - Support DLMM
     * - Are associated with this liquidity pool
     *
     * Used when we want to force-close positions even if
     * bots are not currently marked as "active".
     */
    broadcastClosePositionRequest(
        event: DlmmLiquidityPoolsFetchedEvent
    ) {
        const eligibleDlmmBots = Array.from(this.botsLoaderService.bots.values())
            .filter(
                (bot) =>
                    bot.activeLiquidityPoolType === LiquidityPoolType.Dlmm &&
                    bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === createObjectId(event.liquidityPoolId).toString())
            )

        // Broadcast close-position request.
        // This is still a BROADCAST pattern, not load-balancing.
        for (const bot of eligibleDlmmBots) {
            this.eventEmitter.emit(
                createEventName(
                    EventName.DlmmPositionCloseRequested,
                    { id: bot.id }
                ),
                event
            )
        }
    }

    /**
     * Broadcast open-position request for CLMM pools.
     *
     * Intent:
     * - Fan-out the opportunity to open positions
     * - Bots are currently IDLE (no active liquidity pool)
     *
     * Note:
     * - This currently broadcasts to ALL idle bots
     * - If load / risk control is needed, introduce:
     *   - random sampling (e.g. 30%)
     *   - or deterministic hashing
     */
    broadcastOpenPositionRequest(
        event: ClmmLiquidityPoolsFetchedEvent
    ) {
        // Select bots that are currently idle
        const idleBots = Array.from(this.botsLoaderService.bots.values())
            .filter(
                (bot) => !bot.activeLiquidityPoolType
                && bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === createObjectId(event.liquidityPoolId).toString())
            )

        // Broadcast open-position request to all idle bots.
        // No ordering guarantees are relied upon.
        for (const bot of idleBots) {
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